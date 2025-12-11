const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { protect } = require('../middleware/auth');

// @route   GET /api/favorites
// @desc    Get user's favorite places
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        place_id,
        places!place_id(
          id, name, description, category, images, location, 
          rating, visitors, pricing, menu, shop, services, entertainment
        )
      `)
      .eq('user_id', req.user.id);

    if (error) throw new Error(error.message);

    const places = favorites?.map(f => f.places).filter(Boolean) || [];

    res.json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/favorites/:placeId
// @desc    Add place to favorites
// @access  Private
router.post('/:placeId', protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    // Check if place exists
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id')
      .eq('id', placeId)
      .single();

    if (placeError || !place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Check if already in favorites
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('user_id', req.user.id)
      .eq('place_id', placeId)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Place already in favorites'
      });
    }

    // Add to favorites
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: req.user.id, place_id: placeId });

    if (error) throw new Error(error.message);

    // Get updated favorites list
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('place_id')
      .eq('user_id', req.user.id);

    res.json({
      success: true,
      message: 'Added to favorites',
      data: favorites?.map(f => f.place_id) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/favorites/:placeId
// @desc    Remove place from favorites
// @access  Private
router.delete('/:placeId', protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('place_id', placeId);

    if (error) throw new Error(error.message);

    // Get updated favorites list
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('place_id')
      .eq('user_id', req.user.id);

    res.json({
      success: true,
      message: 'Removed from favorites',
      data: favorites?.map(f => f.place_id) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/favorites/check/:placeId
// @desc    Check if place is in favorites
// @access  Private
router.get('/check/:placeId', protect, async (req, res) => {
  try {
    const { data: favorite } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('user_id', req.user.id)
      .eq('place_id', req.params.placeId)
      .single();

    res.json({
      success: true,
      isFavorite: !!favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
