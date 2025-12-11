const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/owners
// @desc    Get all owners (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: owners, error } = await supabaseAdmin
      .from('business_owners')
      .select(`*, users!user_id(id, name, email, phone, avatar)`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = owners.map(o => ({
      ...o,
      user: o.users,
      users: undefined
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
// @route   POST /api/owners/apply
// @desc    Apply to become a business owner
// @access  Private (Tourist)
router.post('/apply', protect, async (req, res) => {
  try {
    const { businessName, businessType, address, phone, email, website, description, documents } = req.body;

    // Check if user already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('business_owners')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied. Please wait for admin approval.'
      });
    }

    // Create business owner application using supabaseAdmin to bypass RLS
    const { data: businessOwner, error } = await supabaseAdmin
      .from('business_owners')
      .insert({
        user_id: req.user.id,
        business_info: { businessName, businessType, address, phone, email, website, description },
        documents: documents || [],
        verification_status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Please wait for admin approval.',
      data: businessOwner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/my-application
// @desc    Get current user's business owner application
// @access  Private
router.get('/my-application', protect, async (req, res) => {
  try {
    const { data: application, error } = await supabaseAdmin
      .from('business_owners')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !application) {
      return res.status(404).json({
        success: false,
        message: 'No application found'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/profile
// @desc    Get owner profile
// @access  Private (Owner)
router.get('/profile', protect, authorize('business_owner'), async (req, res) => {
  try {
    console.log('📊 Fetching owner profile for user:', req.user.id);

    // Get user info using supabaseAdmin to bypass RLS
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    delete user.password;

    // Get owner profile using supabaseAdmin
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('business_owners')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (ownerError) {
      console.log('⚠️ Owner profile query error (may not exist yet):', ownerError.message);
    }

    // Get owned places using supabaseAdmin
    const { data: ownedPlaces } = await supabaseAdmin
      .from('user_owned_places')
      .select('place_id, places!place_id(*)')
      .eq('user_id', req.user.id);

    // Also get places created by this user
    const { data: createdPlaces } = await supabaseAdmin
      .from('places')
      .select('*')
      .eq('created_by', req.user.id);

    // Combine both
    const allPlaces = [
      ...(ownedPlaces?.map(op => op.places) || []),
      ...(createdPlaces || [])
    ].filter((p, i, arr) => p && arr.findIndex(x => x.id === p.id) === i);

    res.json({
      success: true,
      data: {
        ...owner,
        user,
        places: allPlaces,
        businesses: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/owners/profile
// @desc    Update owner profile
// @access  Private (Owner)
router.put('/profile', protect, authorize('business_owner'), async (req, res) => {
  try {
    const { businessInfo, bankDetails } = req.body;

    const { data: currentOwner } = await supabase
      .from('business_owners')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!currentOwner) {
      return res.status(404).json({
        success: false,
        message: 'Owner profile not found'
      });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (businessInfo) updateData.business_info = { ...currentOwner.business_info, ...businessInfo };
    if (bankDetails) updateData.bank_details = { ...currentOwner.bank_details, ...bankDetails };

    const { data: owner, error } = await supabase
      .from('business_owners')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/applications
// @desc    Get all owner applications (Admin)
// @access  Private (Admin)
router.get('/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    // Use supabaseAdmin to bypass RLS and fetch all applications
    let query = supabaseAdmin
      .from('business_owners')
      .select(`*, users!user_id(id, name, email, phone, avatar)`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('verification_status', status);
    }

    const { data: applications, error } = await query;

    if (error) throw new Error(error.message);

    const formatted = applications.map(a => ({
      ...a,
      user: a.users,
      users: undefined
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

// @route   PUT /api/owners/applications/:id/approve
// @desc    Approve owner application
// @access  Private (Admin)
router.put('/applications/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: owner } = await supabaseAdmin
      .from('business_owners')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('business_owners')
      .update({
        verification_status: 'approved',
        verified: true,
        status: 'active',
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update user role
    await supabaseAdmin
      .from('users')
      .update({ role: 'business_owner' })
      .eq('id', owner.user_id);

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/owners/applications/:id/reject
// @desc    Reject owner application
// @access  Private (Admin)
router.put('/applications/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: owner, error } = await supabaseAdmin
      .from('business_owners')
      .update({
        verification_status: 'rejected',
        verified: false,
        rejection_reason: reason || 'Application does not meet requirements'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application rejected',
      data: owner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/statistics
// @desc    Get owner statistics
// @access  Private (Owner)
router.get('/statistics', protect, authorize('business_owner'), async (req, res) => {
  try {
    // Get owned places
    const { data: ownedPlaces } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', req.user.id);

    // Also get places created by this user
    const { data: createdPlaces } = await supabase
      .from('places')
      .select('id')
      .eq('created_by', req.user.id);

    const ownedPlaceIds = ownedPlaces?.map(op => op.place_id) || [];
    const createdPlaceIds = createdPlaces?.map(p => p.id) || [];
    const allPlaceIds = [...new Set([...ownedPlaceIds, ...createdPlaceIds])];

    let totalBookings = 0;
    let totalRevenue = 0;
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let completedBookings = 0;

    if (allPlaceIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, payment')
        .in('place_id', allPlaceIds);

      if (bookings) {
        totalBookings = bookings.length;
        bookings.forEach(b => {
          if (b.payment?.amount) totalRevenue += b.payment.amount;
          if (b.status === 'pending') pendingBookings++;
          if (b.status === 'confirmed') confirmedBookings++;
          if (b.status === 'completed') completedBookings++;
        });
      }
    }

    // Get owner profile for additional stats
    const { data: owner } = await supabase
      .from('business_owners')
      .select('statistics')
      .eq('user_id', req.user.id)
      .single();

    res.json({
      success: true,
      data: {
        statistics: {
          ...(owner?.statistics || {}),
          totalBookings,
          totalRevenue,
          pendingBookings,
          confirmedBookings,
          completedBookings
        },
        totalBusinesses: 0,
        totalPlaces: allPlaceIds.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/owners/places/:placeId
// @desc    Update owner's place
// @access  Private (Owner)
router.put('/places/:placeId', protect, authorize('business_owner'), async (req, res) => {
  try {
    // Check ownership
    const { data: ownedPlace } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', req.user.id)
      .eq('place_id', req.params.placeId)
      .single();

    const { data: existingPlace } = await supabase
      .from('places')
      .select('created_by')
      .eq('id', req.params.placeId)
      .single();

    if (!existingPlace) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const isOwner = ownedPlace || existingPlace.created_by === req.user.id;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this place'
      });
    }

    const updateData = { ...req.body };
    updateData.updated_at = new Date().toISOString();

    const { data: place, error } = await supabase
      .from('places')
      .update(updateData)
      .eq('id', req.params.placeId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Place updated successfully',
      data: place
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/places/:placeId
// @desc    Get single place details (owner only)
// @access  Private (Owner)
router.get('/places/:placeId', protect, authorize('business_owner'), async (req, res) => {
  try {
    // Check ownership
    const { data: ownedPlace } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', req.user.id)
      .eq('place_id', req.params.placeId)
      .single();

    const { data: place, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', req.params.placeId)
      .single();

    if (error || !place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const isOwner = ownedPlace || place.created_by === req.user.id;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this place'
      });
    }

    res.json({
      success: true,
      data: place
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/owners/reviews
// @desc    Get reviews for owner's places
// @access  Private (Owner)
router.get('/reviews', protect, authorize('business_owner'), async (req, res) => {
  try {
    // Get owned places
    const { data: ownedPlaces } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', req.user.id);

    // Also get places created by this user
    const { data: createdPlaces } = await supabase
      .from('places')
      .select('id')
      .eq('created_by', req.user.id);

    const allPlaceIds = [
      ...(ownedPlaces?.map(op => op.place_id) || []),
      ...(createdPlaces?.map(p => p.id) || [])
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    if (allPlaceIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Fetch reviews for all owned places
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        created_at,
        place_id,
        places!place_id(id, name),
        users!user_id(id, name, avatar)
      `)
      .in('place_id', allPlaceIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    // Format response
    const formattedReviews = (reviews || []).map(r => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      created_at: r.created_at,
      place: r.places,
      user: r.users
    }));

    res.json({
      success: true,
      data: formattedReviews
    });
  } catch (error) {
    console.error('Failed to fetch owner reviews:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
