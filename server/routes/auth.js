const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// reCAPTCHA secret key - IMPORTANT: Set this in your .env file
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Verify reCAPTCHA token
const verifyCaptcha = async (token) => {
  // Skip reCAPTCHA in development if secret key is not properly configured
  if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === 'your-recaptcha-secret-here') {
    if (isDevelopment) {
      console.log('⚠️ reCAPTCHA SKIPPED: No secret key configured (development mode)');
      return true; // Skip in development
    }
    console.error('❌ reCAPTCHA secret key not configured');
    return false;
  }

  if (!token) {
    console.log('❌ reCAPTCHA token not provided');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    });

    const data = await response.json();

    if (!data.success) {
      console.log('❌ reCAPTCHA verification failed:', data['error-codes'] || 'Unknown error');
    } else {
      console.log('✅ reCAPTCHA verification passed');
    }

    return data.success;
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error.message);
    return false;
  }
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password, role, captchaToken } = req.body;

    // Verify reCAPTCHA
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed. Please try again.'
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'tourist'
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Remove password from response
    delete user.password;

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, captchaToken } = req.body;

    // Verify reCAPTCHA
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA verification failed. Please try again.'
      });
    }

    // Get user with password
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Remove password from response
    delete user.password;

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar, preferences, stats, is_active, last_login, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Get user's favorites
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('place_id, places(id, name, images, rating)')
      .eq('user_id', req.user.id);

    user.favorites = favorites?.map(f => f.places) || [];

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/auth/update
// @desc    Update user profile
// @access  Private
router.put('/update', protect, async (req, res) => {
  try {
    const { name, phone, preferences } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        name,
        phone,
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('id, name, email, role, phone, avatar, preferences, stats')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    // Check current password
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/oauth-register
// @desc    Register or login user via OAuth (Google)
// @access  Public
router.post('/oauth-register', async (req, res) => {
  try {
    const { email, name, avatar, supabaseId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      // Create new user with random password (won't be used for OAuth)
      // Use supabaseAdmin to bypass RLS policies for user creation
      const randomPassword = await hashPassword(Math.random().toString(36).slice(-10));

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          password: randomPassword,
          avatar: avatar,
          role: 'tourist'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      user = newUser;
    }

    // Remove password from response
    delete user.password;

    const token = generateToken(user.id);

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      success: true,
      message: 'OAuth login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('OAuth register error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
