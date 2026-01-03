require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function getColumns() {
    try {
        // Get drivers columns
        const drivers = await pool.query('SELECT * FROM drivers LIMIT 1');
        console.log('=== DRIVERS COLUMNS ===');
        console.log(Object.keys(drivers.rows[0] || {}).join('\n'));

        pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        pool.end();
    }
}

getColumns();
