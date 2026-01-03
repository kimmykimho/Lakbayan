const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/businesses
// @desc    Get all businesses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const businesses = await queryAll('SELECT * FROM businesses ORDER BY created_at DESC');
    res.json({ success: true, count: businesses.length, data: businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/businesses/:id
// @desc    Get business by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const business = await queryOne('SELECT * FROM businesses WHERE id = $1', [req.params.id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    res.json({ success: true, data: business });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/businesses
// @desc    Create business
// @access  Private (Business Owner)
router.post('/', protect, authorize('business_owner'), async (req, res) => {
  try {
    const { name, description, category, address, phone, email } = req.body;

    const result = await query(
      `INSERT INTO businesses (owner_id, name, description, category, address, phone, email, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW()) RETURNING *`,
      [req.user.id, name, description, category, address, phone, email]
    );

    res.status(201).json({ success: true, message: 'Business created', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/businesses/:id
// @desc    Update business
// @access  Private (Owner)
router.put('/:id', protect, async (req, res) => {
  try {
    const business = await queryOne('SELECT owner_id FROM businesses WHERE id = $1', [req.params.id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    if (business.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updateData = { ...req.body };
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }
    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ success: true, message: 'Business updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/businesses/:id
// @desc    Delete business
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const business = await queryOne('SELECT id FROM businesses WHERE id = $1', [req.params.id]);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    await query('DELETE FROM businesses WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Business deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
