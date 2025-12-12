const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// Helper to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// @route   GET /api/places
// @desc    Get all places with filters (optimized)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, status, featured, sort, limit, search, page = 1 } = req.query;

    // Default limit to prevent large queries - max 50 items
    const queryLimit = Math.min(parseInt(limit) || 20, 50);
    const offset = (parseInt(page) - 1) * queryLimit;

    // Select only necessary fields for list view (not all columns)
    let query = supabase
      .from('places')
      .select('id, name, slug, description, category, location, images, rating, visitors, featured, status, created_at', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default to active places only for public queries
      query = query.eq('status', 'active');
    }

    if (featured === 'true') query = query.eq('featured', true);
    if (category && category !== 'all') query = query.eq('category', category);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting - use created_at by default (indexed), avoid JSONB sorting when possible
    if (sort === 'rating') {
      query = query.order('created_at', { ascending: false }); // Fallback to indexed column
    } else if (sort === 'popular') {
      query = query.order('created_at', { ascending: false }); // Fallback to indexed column
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + queryLimit - 1);

    const { data: places, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Sort by JSONB fields in JavaScript if needed (faster than DB for small sets)
    let sortedPlaces = places || [];
    if (sort === 'rating' && sortedPlaces.length > 0) {
      sortedPlaces = sortedPlaces.sort((a, b) =>
        (b.rating?.average || 0) - (a.rating?.average || 0)
      );
    } else if (sort === 'popular' && sortedPlaces.length > 0) {
      sortedPlaces = sortedPlaces.sort((a, b) =>
        (b.visitors?.total || 0) - (a.visitors?.total || 0)
      );
    }

    res.json({
      success: true,
      count: sortedPlaces.length,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / queryLimit),
      data: sortedPlaces
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});


// @route   GET /api/places/:id
// @desc    Get single place by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    console.log('📍 Fetching place:', req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid place ID format'
      });
    }

    const { data: place, error } = await supabase
      .from('places')
      .select('*, users!created_by(id, name, email)')
      .eq('id', req.params.id)
      .single();

    if (error || !place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Rename users to createdBy for frontend compatibility
    place.createdBy = place.users;
    delete place.users;

    res.json({
      success: true,
      data: place
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/places
// @desc    Create new place
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const placeData = { ...req.body };

    // Generate slug
    placeData.slug = generateSlug(placeData.name);

    // If ownerEmail is provided, find and link the user
    if (req.body.ownerEmail) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', req.body.ownerEmail.toLowerCase())
        .single();

      if (owner) {
        placeData.created_by = owner.id;
      } else {
        console.log(`⚠️ Owner email ${req.body.ownerEmail} not found, using admin as creator`);
        placeData.created_by = req.user.id;
      }

      delete placeData.ownerEmail;
    } else {
      placeData.created_by = req.user.id;
    }

    // Convert camelCase to snake_case for DB
    if (placeData.contactInfo) {
      placeData.contact = placeData.contactInfo;
      delete placeData.contactInfo;
    }
    if (placeData.bestTimeToVisit) {
      placeData.best_time_to_visit = placeData.bestTimeToVisit;
      delete placeData.bestTimeToVisit;
    }
    if (placeData.virtualTour) {
      placeData.virtual_tour = placeData.virtualTour;
      delete placeData.virtualTour;
    }
    // Handle entryFee - should be stored in pricing JSONB
    if (placeData.entryFee !== undefined) {
      placeData.pricing = {
        ...placeData.pricing,
        entryFee: placeData.entryFee
      };
      delete placeData.entryFee;
    }
    // Handle facilities - should be stored as amenities in DB
    if (placeData.facilities !== undefined) {
      placeData.amenities = placeData.facilities;
      delete placeData.facilities;
    }
    // Handle openingHours - should be stored as hours in DB
    if (placeData.openingHours !== undefined) {
      placeData.hours = placeData.openingHours;
      delete placeData.openingHours;
    }
    // Handle nowShowing - should be stored in entertainment JSONB
    if (placeData.nowShowing !== undefined) {
      placeData.entertainment = {
        ...placeData.entertainment,
        nowShowing: placeData.nowShowing
      };
      delete placeData.nowShowing;
    }
    // Handle shopCategories and shopDetails - should be stored in shop JSONB
    if (placeData.shopCategories !== undefined || placeData.shopDetails !== undefined) {
      placeData.shop = {
        ...placeData.shop,
        categories: placeData.shopCategories || placeData.shop?.categories || [],
        details: placeData.shopDetails || placeData.shop?.details || ''
      };
      delete placeData.shopCategories;
      delete placeData.shopDetails;
    }
    // Handle pricePerNight - should be stored in pricing JSONB
    if (placeData.pricePerNight !== undefined) {
      placeData.pricing = {
        ...placeData.pricing,
        pricePerNight: placeData.pricePerNight
      };
      delete placeData.pricePerNight;
    }
    // Remove fields that don't exist in DB schema
    delete placeData.ownerEmail;

    const { data: place, error } = await supabaseAdmin
      .from('places')
      .insert(placeData)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update user's owned_places if owner was found
    if (req.body.ownerEmail) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', req.body.ownerEmail.toLowerCase())
        .single();

      if (owner) {
        await supabaseAdmin
          .from('user_owned_places')
          .insert({ user_id: owner.id, place_id: place.id });
        console.log(`✅ Added place to user's owned places`);
      }
    }

    res.status(201).json({
      success: true,
      data: place
    });
  } catch (error) {
    console.error('Error creating place:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/places/:id
// @desc    Update place
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const placeData = { ...req.body };
    placeData.updated_at = new Date().toISOString();

    // If ownerEmail is provided, update the owner relationship
    if (req.body.ownerEmail !== undefined) {
      // Get existing place
      const { data: existingPlace } = await supabaseAdmin
        .from('places')
        .select('created_by')
        .eq('id', req.params.id)
        .single();

      if (req.body.ownerEmail) {
        // Find new owner
        const { data: newOwner } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', req.body.ownerEmail.toLowerCase())
          .single();

        if (newOwner) {
          placeData.created_by = newOwner.id;

          // Remove from old owner's owned places
          if (existingPlace?.created_by) {
            await supabaseAdmin
              .from('user_owned_places')
              .delete()
              .eq('user_id', existingPlace.created_by)
              .eq('place_id', req.params.id);
          }

          // Add to new owner's owned places
          await supabaseAdmin
            .from('user_owned_places')
            .upsert({ user_id: newOwner.id, place_id: req.params.id });
        }
      } else {
        // Remove owner relationship
        if (existingPlace?.created_by) {
          await supabaseAdmin
            .from('user_owned_places')
            .delete()
            .eq('user_id', existingPlace.created_by)
            .eq('place_id', req.params.id);
        }
        placeData.created_by = null;
      }

      delete placeData.ownerEmail;
    }

    // Convert camelCase to snake_case
    if (placeData.contactInfo) {
      placeData.contact = placeData.contactInfo;
      delete placeData.contactInfo;
    }
    if (placeData.bestTimeToVisit) {
      placeData.best_time_to_visit = placeData.bestTimeToVisit;
      delete placeData.bestTimeToVisit;
    }
    if (placeData.virtualTour) {
      placeData.virtual_tour = placeData.virtualTour;
      delete placeData.virtualTour;
    }
    // Handle entryFee - should be stored in pricing JSONB
    if (placeData.entryFee !== undefined) {
      placeData.pricing = {
        ...placeData.pricing,
        entryFee: placeData.entryFee
      };
      delete placeData.entryFee;
    }
    // Handle facilities - should be stored as amenities in DB
    if (placeData.facilities !== undefined) {
      placeData.amenities = placeData.facilities;
      delete placeData.facilities;
    }
    // Handle openingHours - should be stored as hours in DB
    if (placeData.openingHours !== undefined) {
      placeData.hours = placeData.openingHours;
      delete placeData.openingHours;
    }
    // Handle nowShowing - should be stored in entertainment JSONB
    if (placeData.nowShowing !== undefined) {
      placeData.entertainment = {
        ...placeData.entertainment,
        nowShowing: placeData.nowShowing
      };
      delete placeData.nowShowing;
    }
    // Handle shopCategories and shopDetails - should be stored in shop JSONB
    if (placeData.shopCategories !== undefined || placeData.shopDetails !== undefined) {
      placeData.shop = {
        ...placeData.shop,
        categories: placeData.shopCategories || placeData.shop?.categories || [],
        details: placeData.shopDetails || placeData.shop?.details || ''
      };
      delete placeData.shopCategories;
      delete placeData.shopDetails;
    }
    // Handle pricePerNight - should be stored in pricing JSONB
    if (placeData.pricePerNight !== undefined) {
      placeData.pricing = {
        ...placeData.pricing,
        pricePerNight: placeData.pricePerNight
      };
      delete placeData.pricePerNight;
    }

    const { data: place, error } = await supabaseAdmin
      .from('places')
      .update(placeData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    res.json({
      success: true,
      message: 'Place updated successfully',
      data: place
    });
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/places/:id
// @desc    Delete place
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('🗑️ Delete request for place:', req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid place ID format'
      });
    }

    // Get place first
    const { data: place } = await supabaseAdmin
      .from('places')
      .select('id, name, created_by')
      .eq('id', req.params.id)
      .single();

    if (!place) {
      console.log('❌ Place not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Remove from owner's owned places
    if (place.created_by) {
      await supabaseAdmin
        .from('user_owned_places')
        .delete()
        .eq('place_id', req.params.id);
    }

    // Remove from user favorites
    await supabaseAdmin
      .from('user_favorites')
      .delete()
      .eq('place_id', req.params.id);

    // Delete reviews for this place
    await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('place_id', req.params.id);

    // Get all bookings for this place to delete related transport requests
    const { data: placeBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('place_id', req.params.id);

    if (placeBookings && placeBookings.length > 0) {
      const bookingIds = placeBookings.map(b => b.id);

      // Delete transport requests linked to these bookings
      await supabaseAdmin
        .from('transport_requests')
        .delete()
        .in('booking_id', bookingIds);
    }

    // Delete bookings for this place
    await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('place_id', req.params.id);

    // Delete the place
    const { error } = await supabaseAdmin
      .from('places')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Place deleted successfully:', place.name);

    res.json({
      success: true,
      message: 'Place deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/places/:id/reviews
// @desc    Add review to place
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment, title } = req.body;

    // Check if place exists
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id, rating')
      .eq('id', req.params.id)
      .single();

    if (placeError || !place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Create review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        place_id: req.params.id,
        user_id: req.user.id,
        rating,
        comment,
        title
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update place rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('place_id', req.params.id);

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await supabase
      .from('places')
      .update({
        rating: { average: Math.round(avgRating * 10) / 10, count: reviews.length }
      })
      .eq('id', req.params.id);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
