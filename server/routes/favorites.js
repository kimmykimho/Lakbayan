const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect } = require('../middleware/auth');

// @route   GET /api/favorites
// @desc    Get user's favorite places
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await queryAll(
      `SELECT p.id, p.name, p.description, p.category, p.images, p.location, p.rating 
       FROM user_favorites uf 
       JOIN places p ON uf.place_id = p.id 
       WHERE uf.user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/favorites/:placeId
// @desc    Add place to favorites
// @access  Private
router.post('/:placeId', protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    const place = await queryOne('SELECT id FROM places WHERE id = $1', [placeId]);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    const existing = await queryOne(
      'SELECT user_id FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [req.user.id, placeId]
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'Place already in favorites' });
    }

    await query(
      'INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2)',
      [req.user.id, placeId]
    );

    const favorites = await queryAll(
      'SELECT place_id FROM user_favorites WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Added to favorites',
      data: favorites.map(f => f.place_id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/favorites/:placeId
// @desc    Remove place from favorites
// @access  Private
router.delete('/:placeId', protect, async (req, res) => {
  try {
    await query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [req.user.id, req.params.placeId]
    );

    const favorites = await queryAll(
      'SELECT place_id FROM user_favorites WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Removed from favorites',
      data: favorites.map(f => f.place_id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/favorites/check/:placeId
// @desc    Check if place is in favorites
// @access  Private
router.get('/check/:placeId', protect, async (req, res) => {
  try {
    const favorite = await queryOne(
      'SELECT user_id FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [req.user.id, req.params.placeId]
    );

    res.json({ success: true, isFavorite: !!favorite });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
