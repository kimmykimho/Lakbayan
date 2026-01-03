const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { queryOne, getCached, setCache } = require('../config/neon');

// Cache for verified tokens (5 minute TTL)
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000;

// Get cached token verification
const getCachedToken = (token) => {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  tokenCache.delete(token);
  return null;
};

// Set cached token verification
const setCachedToken = (token, data) => {
  tokenCache.set(token, { data, expires: Date.now() + TOKEN_CACHE_TTL });
};

// Protect routes - verify JWT token with caching
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - no token'
      });
    }

    // Check token cache first
    const cachedAuth = getCachedToken(token);
    if (cachedAuth) {
      req.user = cachedAuth;
      return next();
    }

    console.log('🔒 Auth Check - Token:', token ? 'Present' : 'Missing');

    let userId = null;
    let userEmail = null;

    // Try custom JWT first (faster - no network call)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (jwtErr) {
      // Not a custom JWT, try Supabase OAuth
      try {
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
        if (supabaseUser && !error) {
          userEmail = supabaseUser.email;
          console.log('✅ OAuth verified:', userEmail);
        }
      } catch (e) {
        // Token invalid
      }
    }

    if (!userId && !userEmail) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Get user from Neon - check user cache first
    const cacheKey = userEmail ? `user:email:${userEmail.toLowerCase()}` : `user:id:${userId}`;
    let user = getCached(cacheKey);

    if (!user) {
      if (userEmail) {
        user = await queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);
      } else {
        user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
      }

      if (user) {
        setCache(cacheKey, user, 60000); // 1 min cache
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    delete user.password;
    req.user = user;

    // Cache the full auth result
    setCachedToken(token, user);

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorize roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' not authorized`
      });
    }
    next();
  };
};
