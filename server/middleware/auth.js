const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Protect routes - verify JWT token (supports both Supabase OAuth and custom JWTs)
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route - no token provided'
      });
    }

    let userId = null;
    let userEmail = null;

    // First, try to verify as Supabase OAuth token
    try {
      const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);

      if (supabaseUser && !supabaseError) {
        // Valid Supabase OAuth token
        userId = supabaseUser.id;
        userEmail = supabaseUser.email;
        console.log('✅ Supabase OAuth token verified for:', userEmail);
      }
    } catch (supabaseErr) {
      // Not a Supabase token, try JWT_SECRET
      console.log('Token is not a Supabase OAuth token, trying JWT_SECRET...');
    }

    // If not a Supabase token, try custom JWT
    if (!userId) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        console.log('✅ Custom JWT verified for user ID:', userId);
      } catch (jwtErr) {
        console.error('❌ Both Supabase and JWT verification failed');
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }

    // Get user from database using admin client to bypass RLS
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(`id.eq.${userId},email.eq.${userEmail}`)
      .single();

    if (error || !user) {
      console.error('User lookup error:', error?.message || 'User not found');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Remove password from user object
    delete user.password;

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Required: ${roles.join(', ')}`
      });
    }
    next();
  };
};
