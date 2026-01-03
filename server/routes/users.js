const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize, admin } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await queryAll(
      'SELECT id, name, email, role, phone, avatar, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's own profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, location, avatar } = req.body;

    const updateFields = ['updated_at = NOW()'];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramIndex++}`); values.push(name); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (avatar !== undefined) { updateFields.push(`avatar = $${paramIndex++}`); values.push(avatar); }

    values.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, role, phone, avatar, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/:id/details
// @desc    Get user details (Admin only)
// @access  Private/Admin
router.get('/:id/details', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    delete user.password;

    let profile = null;
    if (user.role === 'business_owner') {
      profile = await queryOne('SELECT * FROM business_owners WHERE user_id = $1', [user.id]);
    } else if (user.role === 'driver') {
      profile = await queryOne('SELECT * FROM drivers WHERE user_id = $1', [user.id]);
    }

    res.json({
      success: true,
      data: { user, profile, ownedPlaces: [] }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/create
// @desc    Create new user with role (Admin only)
// @access  Private/Admin
router.post('/create', protect, authorize('admin'), async (req, res) => {
  try {
    const { email, role, name } = req.body;
    const bcrypt = require('bcryptjs');

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    const validRoles = ['tourist', 'business_owner', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const tempPassword = 'Welcome123!';
    const displayName = name || email.split('@')[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const result = await query(
      `INSERT INTO users (email, name, role, password, is_active, created_at, updated_at) 
       VALUES (LOWER($1), $2, $3, $4, true, NOW(), NOW()) 
       RETURNING id, email, name, role, is_active`,
      [email, displayName, role, hashedPassword]
    );

    const user = result.rows[0];

    if (role === 'business_owner') {
      await query(
        `INSERT INTO business_owners (user_id, verification_status, status, approved_by, approved_at) 
         VALUES ($1, 'approved', 'active', $2, NOW())`,
        [user.id, req.user.id]
      );
    }

    res.status(201).json({
      success: true,
      message: `User created successfully. Temporary password: ${tempPassword}`,
      data: { user, tempPassword }
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/:id/favorites/:placeId
// @desc    Add place to favorites
// @access  Private
router.post('/:id/favorites/:placeId', protect, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await query(
      `INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.placeId]
    );

    const favorites = await queryAll(
      `SELECT p.id, p.name, p.images, p.rating FROM user_favorites uf 
       JOIN places p ON uf.place_id = p.id WHERE uf.user_id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Added to favorites', data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/:id/favorites/:placeId
// @desc    Remove place from favorites
// @access  Private
router.delete('/:id/favorites/:placeId', protect, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [req.params.id, req.params.placeId]
    );

    const favorites = await queryAll(
      `SELECT p.id, p.name, p.images, p.rating FROM user_favorites uf 
       JOIN places p ON uf.place_id = p.id WHERE uf.user_id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Removed from favorites', data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password;

    const updateFields = ['updated_at = NOW()'];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    values.push(req.params.id);
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, name, email, role, phone, avatar, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🗑️ Deleting user:', userId);

    // Delete related data in correct order
    await query('DELETE FROM reviews WHERE user_id = $1', [userId]);
    await query('DELETE FROM user_favorites WHERE user_id = $1', [userId]);

    // Get bookings to delete transport requests
    const bookings = await queryAll('SELECT id FROM bookings WHERE user_id = $1', [userId]);
    for (const b of bookings) {
      await query('DELETE FROM transport_requests WHERE booking_id = $1', [b.id]);
    }
    await query('DELETE FROM bookings WHERE user_id = $1', [userId]);

    // Delete driver related
    const driver = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [userId]);
    if (driver) {
      await query('DELETE FROM transport_requests WHERE driver_id = $1', [driver.id]);
      await query('DELETE FROM drivers WHERE user_id = $1', [userId]);
    }

    await query('DELETE FROM business_owners WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);

    console.log('✅ User deleted successfully');
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/:id/place
// @desc    Create place for business owner (Admin only)
// @access  Private/Admin
router.post('/:id/place', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await queryOne('SELECT id, role, name, email FROM users WHERE id = $1', [req.params.id]);

    if (!user || user.role !== 'business_owner') {
      return res.status(400).json({ success: false, message: 'User is not a business owner' });
    }

    const placeData = { ...req.body };
    const slug = placeData.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();

    const columns = ['name', 'slug', 'owner_id', 'status', 'created_at', 'updated_at'];
    const vals = [placeData.name, slug, user.id, 'active', new Date(), new Date()];

    if (placeData.description) { columns.push('description'); vals.push(placeData.description); }
    if (placeData.category) { columns.push('category'); vals.push(placeData.category); }
    if (placeData.images) { columns.push('images'); vals.push(JSON.stringify(placeData.images)); }
    if (placeData.location) { columns.push('location'); vals.push(JSON.stringify(placeData.location)); }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `INSERT INTO places (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );

    res.status(201).json({
      success: true,
      message: 'Place created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Place creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/:id/business
// @desc    Create business for business owner (Admin only)
// @access  Private/Admin
router.post('/:id/business', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await queryOne('SELECT id, role, name, email FROM users WHERE id = $1', [req.params.id]);

    if (!user || user.role !== 'business_owner') {
      return res.status(400).json({ success: false, message: 'User is not a business owner' });
    }

    res.status(201).json({
      success: true,
      message: 'Business feature not yet migrated to Neon',
      data: null
    });
  } catch (error) {
    console.error('Business creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
