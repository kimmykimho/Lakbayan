const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reviews
// @desc    Get all reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    const reviews = await queryAll(
      `SELECT r.*, u.id as user_db_id, u.name as user_name, u.avatar as user_avatar, p.id as place_db_id, p.name as place_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN places p ON r.place_id = p.id
       ORDER BY r.created_at DESC`
    );

    const formatted = reviews.map(r => ({
      ...r,
      user: { id: r.user_db_id, name: r.user_name, avatar: r.user_avatar },
      place: { id: r.place_db_id, name: r.place_name }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/reviews
// @desc    Create new review
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { place, rating, title, comment, booking, images } = req.body;

    if (!place || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Place ID and rating (1-5) required' });
    }

    const existingReview = await queryOne(
      'SELECT id FROM reviews WHERE user_id = $1 AND place_id = $2',
      [req.user.id, place]
    );

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this place' });
    }

    const result = await query(
      `INSERT INTO reviews (user_id, place_id, booking_id, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [req.user.id, place, booking || null, rating, comment]
    );

    // Update place rating
    const allReviews = await queryAll('SELECT rating FROM reviews WHERE place_id = $1', [place]);
    if (allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await query(
        'UPDATE places SET rating = $1 WHERE id = $2',
        [JSON.stringify({ average: Math.round(avgRating * 10) / 10, count: allReviews.length }), place]
      );
    }

    res.status(201).json({ success: true, message: 'Review created', data: result.rows[0] });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const reviews = await queryAll(
      `SELECT r.*, p.id as place_db_id, p.name as place_name, p.images as place_images
       FROM reviews r
       LEFT JOIN places p ON r.place_id = p.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const formatted = reviews.map(r => ({
      ...r,
      place: { id: r.place_db_id, name: r.place_name, images: r.place_images }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reviews/place/:placeId
// @desc    Get reviews for a place
// @access  Public
router.get('/place/:placeId', async (req, res) => {
  try {
    const reviews = await queryAll(
      `SELECT r.*, u.id as user_db_id, u.name as user_name, u.avatar as user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.place_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.placeId]
    );

    const formatted = reviews.map(r => ({
      ...r,
      user: { id: r.user_db_id, name: r.user_name, avatar: r.user_avatar }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const review = await queryOne('SELECT user_id FROM reviews WHERE id = $1', [req.params.id]);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user_id !== req.user.id) {
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
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ success: true, message: 'Review updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await queryOne('SELECT user_id, place_id FROM reviews WHERE id = $1', [req.params.id]);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);

    // Update place rating
    const remainingReviews = await queryAll('SELECT rating FROM reviews WHERE place_id = $1', [review.place_id]);
    if (remainingReviews.length > 0) {
      const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
      await query(
        'UPDATE places SET rating = $1 WHERE id = $2',
        [JSON.stringify({ average: Math.round(avgRating * 10) / 10, count: remainingReviews.length }), review.place_id]
      );
    } else {
      await query('UPDATE places SET rating = $1 WHERE id = $2', [JSON.stringify({ average: 0, count: 0 }), review.place_id]);
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
