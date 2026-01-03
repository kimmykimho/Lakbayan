/**
 * Neon Database Configuration with In-Memory Caching
 * Reduces Neon cold-start issues by caching common queries
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
}

// Connection pool
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000
});

pool.on('error', (err) => console.error('Pool error:', err.message));

// In-memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

const getCached = (key) => {
    const item = cache.get(key);
    if (item && Date.now() < item.expires) {
        return item.data;
    }
    cache.delete(key);
    return null;
};

const setCache = (key, data, ttl = CACHE_TTL) => {
    cache.set(key, { data, expires: Date.now() + ttl });
};

// Query with retry logic
const query = async (text, params, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await pool.query(text, params);
            return result;
        } catch (err) {
            console.error(`Query attempt ${attempt}/${retries}:`, err.message);
            if (attempt < retries && (err.message.includes('Connection') || err.message.includes('timeout') || err.message.includes('ETIMEDOUT'))) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            throw err;
        }
    }
};

const queryOne = async (text, params) => {
    const result = await query(text, params);
    return result.rows[0] || null;
};

const queryAll = async (text, params) => {
    const result = await query(text, params);
    return result.rows;
};

// Cached queries for public endpoints
const queryCached = async (cacheKey, text, params, ttl = CACHE_TTL) => {
    const cached = getCached(cacheKey);
    if (cached) {
        console.log('📦 Cache hit:', cacheKey);
        return cached;
    }
    const result = await query(text, params);
    setCache(cacheKey, result.rows, ttl);
    console.log('💾 Cached:', cacheKey, `(${result.rows.length} rows)`);
    return result.rows;
};

// Invalidate cache
const invalidateCache = (pattern) => {
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
};

module.exports = {
    pool,
    query,
    queryOne,
    queryAll,
    queryCached,
    invalidateCache,
    setCache,
    getCached
};
