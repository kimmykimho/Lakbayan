const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase'); // Only for OAuth token verification
const { queryOne, queryAll, query } = require('../config/neon');
const { protect } = require('../middleware/auth');

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const isDevelopment = process.env.NODE_ENV !== 'production';

const verifyCaptcha = async (token) => {
  if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY === 'your-recaptcha-secret-here') {
    if (isDevelopment) {
      console.log('⚠️ reCAPTCHA SKIPPED: No secret key configured (development mode)');
      return true;
    }
    return false;
  }
  if (!token) return false;

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// @route   POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, captchaToken } = req.body;

    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed' });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const hashedPassword = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at) 
       VALUES ($1, LOWER($2), $3, $4, true, NOW(), NOW()) RETURNING id, name, email, role, is_active, created_at`,
      [name, email, hashedPassword, role || 'tourist']
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ success: true, message: 'User registered successfully', data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, captchaToken } = req.body;

    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed' });
    }

    const user = await queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    delete user.password;
    const token = generateToken(user.id);

    res.json({ success: true, message: 'Login successful', data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, name, email, role, phone, avatar, is_active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Favorites are fetched by the favorites component separately
    // const favorites = await queryAll(...)
    // user.favorites = favorites;

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/update
router.put('/update', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW() 
       WHERE id = $3 RETURNING id, name, email, role, phone, avatar`,
      [name, phone, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await queryOne('SELECT password FROM users WHERE id = $1', [req.user.id]);

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/oauth-register
// @desc    Register or login user via OAuth (Google) - uses Supabase for OAuth token verification
router.post('/oauth-register', async (req, res) => {
  try {
    const { email, name, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user exists in Neon database
    let user = await queryOne('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (!user) {
      // Create new user
      const randomPassword = await hashPassword(Math.random().toString(36).slice(-10));
      const result = await query(
        `INSERT INTO users (name, email, password, avatar, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'tourist', true, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET last_login = NOW()
         RETURNING *`,
        [name || email.split('@')[0], normalizedEmail, randomPassword, avatar]
      );
      user = result.rows[0];
    } else {
      // Update last login
      await query('UPDATE users SET last_login = NOW(), avatar = COALESCE($1, avatar) WHERE id = $2', [avatar, user.id]);
    }

    if (!user) {
      throw new Error('Failed to find or create user');
    }

    delete user.password;
    const token = generateToken(user.id);

    res.json({ success: true, message: 'OAuth login successful', data: { user, token } });
  } catch (error) {
    console.error('OAuth register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
