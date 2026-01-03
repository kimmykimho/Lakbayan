const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

const generateConfirmationCode = () => {
  return 'BV' + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substr(2, 5).toUpperCase();
};

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await queryAll(
      `SELECT b.*, p.id as place_id, p.name as place_name, p.images as place_images, p.location as place_location
       FROM bookings b
       LEFT JOIN places p ON b.place_id = p.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const formattedBookings = bookings.map(b => ({
      ...b,
      place: { id: b.place_id, name: b.place_name, images: b.place_images, location: b.place_location }
    }));

    res.json({ success: true, count: formattedBookings.length, data: formattedBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/bookings/my
// @desc    Get current user's bookings (alias for /)
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await queryAll(
      `SELECT b.*, p.id as place_id, p.name as place_name, p.images as place_images, p.location as place_location
       FROM bookings b
       LEFT JOIN places p ON b.place_id = p.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const formattedBookings = bookings.map(b => ({
      ...b,
      place: { id: b.place_id, name: b.place_name, images: b.place_images, location: b.place_location }
    }));

    res.json({ success: true, count: formattedBookings.length, data: formattedBookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/bookings/owner
// @desc    Get bookings for owner's places
// @access  Private (Business Owner)
router.get('/owner', protect, authorize('business_owner'), async (req, res) => {
  try {
    const places = await queryAll('SELECT id FROM places WHERE owner_id = $1', [req.user.id]);
    const placeIds = places.map(p => p.id);

    if (placeIds.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const bookings = await queryAll(
      `SELECT b.*, p.name as place_name, p.images as place_images, u.name as user_name, u.email as user_email
       FROM bookings b
       LEFT JOIN places p ON b.place_id = p.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.place_id = ANY($1)
       ORDER BY b.created_at DESC`,
      [placeIds]
    );

    const formattedBookings = bookings.map(b => ({
      ...b,
      place: { name: b.place_name, images: b.place_images },
      user: { name: b.user_name, email: b.user_email }
    }));

    res.json({ success: true, count: formattedBookings.length, data: formattedBookings });
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { place, visitDate, visitTime, numberOfVisitors, transport, specialRequests, contactInfo } = req.body;

    const placeDoc = await queryOne('SELECT id FROM places WHERE id = $1', [place]);
    if (!placeDoc) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    const confirmationCode = generateConfirmationCode();
    const result = await query(
      `INSERT INTO bookings (user_id, place_id, visit_date, visit_time, number_of_visitors, transport, special_requests, confirmation_code, contact_info, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
       RETURNING *`,
      [req.user.id, place, visitDate, visitTime, numberOfVisitors, JSON.stringify(transport || {}), specialRequests, confirmationCode, JSON.stringify(contactInfo || {})]
    );

    res.status(201).json({ success: true, message: 'Booking created', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await queryOne(
      `SELECT b.*, p.name as place_name, p.images as place_images
       FROM bookings b
       LEFT JOIN places p ON b.place_id = p.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.place = { name: booking.place_name, images: booking.place_images };
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/bookings/:id/confirm
// @desc    Confirm booking
// @access  Private
router.put('/:id/confirm', protect, async (req, res) => {
  try {
    const result = await query(
      `UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking confirmed', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/bookings/:id/complete
// @desc    Mark booking as completed
// @access  Private
router.put('/:id/complete', protect, async (req, res) => {
  try {
    // First get the booking details to know place_id and number_of_visitors
    const booking = await queryOne('SELECT place_id, number_of_visitors FROM bookings WHERE id = $1', [req.params.id]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const result = await query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found (concurrent delete?)' });
    }

    // Increment visitors count in places table
    // Assuming visitors is a JSONB column with a 'total' field
    await query(
      `UPDATE places 
       SET visitors = jsonb_set(
         COALESCE(visitors, '{"total": 0}'), 
         '{total}', 
         (COALESCE((visitors->>'total')::int, 0) + $1)::text::jsonb
       )
       WHERE id = $2`,
      [booking.number_of_visitors || 1, booking.place_id]
    );

    res.json({ success: true, message: 'Booking completed', data: result.rows[0] });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const result = await query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking cancelled', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
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
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
