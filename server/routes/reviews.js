const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reviews
// @desc    Get all reviews
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`*, users!user_id(id, name, avatar), places!place_id(id, name)`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = reviews.map(r => ({
      ...r,
      user: r.users,
      place: r.places,
      users: undefined,
      places: undefined
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/reviews
// @desc    Create new review
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { place, rating, title, comment, booking, images } = req.body;

    console.log('📝 Creating review:', { place, rating, user_id: req.user.id });

    // Validate required fields
    if (!place) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user already reviewed this place (use admin to bypass RLS)
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('place_id', place)
      .single();

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this place'
      });
    }

    // Insert the review using admin client to bypass RLS
    const { data: review, error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({
        user_id: req.user.id,
        place_id: place,
        booking_id: booking || null,
        rating,
        title: title || null,
        comment,
        images: images || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Review insert error:', insertError);
      throw new Error(insertError.message);
    }

    console.log('✅ Review created:', review.id);

    // Update user stats (don't fail if this errors)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('stats')
        .eq('id', req.user.id)
        .single();

      const currentStats = userData?.stats || { reviewsCount: 0 };
      await supabase
        .from('users')
        .update({
          stats: {
            ...currentStats,
            reviewsCount: (currentStats.reviewsCount || 0) + 1
          }
        })
        .eq('id', req.user.id);
    } catch (statsError) {
      console.error('⚠️ Failed to update user stats:', statsError);
    }

    // Update place rating
    try {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('place_id', place);

      if (allReviews && allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from('places')
          .update({
            rating: { average: Math.round(avgRating * 10) / 10, count: allReviews.length }
          })
          .eq('id', place);
        console.log('✅ Place rating updated:', avgRating.toFixed(1));
      }
    } catch (ratingError) {
      console.error('⚠️ Failed to update place rating:', ratingError);
    }

    // Fetch user info for response
    const { data: user } = await supabase
      .from('users')
      .select('id, name, avatar')
      .eq('id', req.user.id)
      .single();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        ...review,
        user: user || { id: req.user.id, name: 'Anonymous' }
      }
    });
  } catch (error) {
    console.error('❌ Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review'
    });
  }
});

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        places!place_id(id, name, images)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format response
    const formattedReviews = reviews.map(r => ({
      ...r,
      place: r.places,
      places: undefined
    }));

    res.json({
      success: true,
      count: formattedReviews.length,
      data: formattedReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reviews/place/:placeId
// @desc    Get reviews for a place
// @access  Public
router.get('/place/:placeId', async (req, res) => {
  try {
    // Use supabaseAdmin to bypass RLS
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        users!user_id(id, name, avatar)
      `)
      .eq('place_id', req.params.placeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format response
    const formattedReviews = reviews.map(r => ({
      ...r,
      user: r.users,
      users: undefined
    }));

    res.json({
      success: true,
      count: formattedReviews.length,
      data: formattedReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    // Check ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updateData = { ...req.body };
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Check ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id, place_id')
      .eq('id', req.params.id)
      .single();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new Error(error.message);

    // Update place rating
    const { data: remainingReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('place_id', review.place_id);

    if (remainingReviews && remainingReviews.length > 0) {
      const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
      await supabase
        .from('places')
        .update({
          rating: { average: Math.round(avgRating * 10) / 10, count: remainingReviews.length }
        })
        .eq('id', review.place_id);
    } else {
      await supabase
        .from('places')
        .update({ rating: { average: 0, count: 0 } })
        .eq('id', review.place_id);
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
