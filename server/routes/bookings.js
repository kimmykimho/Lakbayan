const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// Generate confirmation code
const generateConfirmationCode = () => {
  return 'BV' + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substr(2, 5).toUpperCase();
};

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 Fetching bookings for user:', userId);

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        places!place_id(id, name, images, location)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      throw new Error(error.message);
    }

    console.log('✅ Found', bookings.length, 'bookings');

    // Rename places to place for frontend compatibility
    const formattedBookings = bookings.map(b => ({
      ...b,
      place: b.places,
      places: undefined
    }));

    res.json({
      success: true,
      count: formattedBookings.length,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/bookings/owner
// @desc    Get bookings for owner's places
// @access  Private (Business Owner)
router.get('/owner', protect, authorize('business_owner'), async (req, res) => {
  try {
    console.log('📊 Fetching owner bookings for user:', req.user.id);

    // First get places owned by this business owner
    const { data: createdPlaces } = await supabaseAdmin
      .from('places')
      .select('id')
      .eq('created_by', req.user.id);

    // Also check user_owned_places table
    const { data: ownedPlaces } = await supabaseAdmin
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', req.user.id);

    const placeIds = [
      ...(createdPlaces?.map(p => p.id) || []),
      ...(ownedPlaces?.map(p => p.place_id) || [])
    ].filter((id, idx, arr) => arr.indexOf(id) === idx);

    console.log('Found', placeIds.length, 'owned places:', placeIds);

    if (placeIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get bookings for these places
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        places!place_id(id, name, images, location),
        users!user_id(id, name, email, phone)
      `)
      .in('place_id', placeIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching owner bookings:', error);
      throw new Error(error.message);
    }

    console.log('✅ Found', bookings.length, 'bookings for owner places');

    // Format the response
    const formattedBookings = bookings.map(b => ({
      ...b,
      place: b.places,
      user: b.users,
      places: undefined,
      users: undefined
    }));

    res.json({
      success: true,
      count: formattedBookings.length,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { place, visitDate, visitTime, numberOfVisitors, transport, specialRequests, contactInfo } = req.body;

    console.log('📅 Creating booking:', { place, visitDate, visitTime, numberOfVisitors });

    // Check if place exists
    const { data: placeDoc, error: placeError } = await supabaseAdmin
      .from('places')
      .select('id')
      .eq('id', place)
      .single();

    if (placeError || !placeDoc) {
      console.log('❌ Place not found:', place);
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const userId = req.user.id;
    const confirmationCode = generateConfirmationCode();

    // Create booking using supabaseAdmin to bypass RLS
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        place_id: place,
        visit_date: visitDate,
        visit_time: visitTime,
        number_of_visitors: numberOfVisitors,
        transport: transport || {},
        special_requests: specialRequests,
        confirmation_code: confirmationCode,
        contact_info: contactInfo || {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone
        }
      })
      .select(`
        *,
        places!place_id(id, name, images, location)
      `)
      .single();

    if (error) {
      console.error('❌ Booking creation error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Booking created successfully:', booking.id);

    // Update user stats using supabaseAdmin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stats')
      .eq('id', userId)
      .single();

    const currentStats = userData?.stats || { bookingsCount: 0 };
    await supabaseAdmin
      .from('users')
      .update({
        stats: {
          ...currentStats,
          bookingsCount: (currentStats.bookingsCount || 0) + 1
        }
      })
      .eq('id', userId);

    // Format response
    booking.place = booking.places;
    delete booking.places;

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/bookings/owner
// @desc    Get bookings for owner's places
// @access  Private (Owner)
router.get('/owner', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's owned places
    const { data: ownedPlaces } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', userId);

    // Also get places created by this user
    const { data: createdPlaces } = await supabase
      .from('places')
      .select('id')
      .eq('created_by', userId);

    const ownedPlaceIds = ownedPlaces?.map(op => op.place_id) || [];
    const createdPlaceIds = createdPlaces?.map(p => p.id) || [];
    const allPlaceIds = [...new Set([...ownedPlaceIds, ...createdPlaceIds])];

    console.log(`📊 Owner ${userId} - Total places: ${allPlaceIds.length}`);

    if (allPlaceIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Find all bookings for owner's places
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        places!place_id(id, name, images, location, created_by),
        users!user_id(id, name, email, phone)
      `)
      .in('place_id', allPlaceIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format bookings
    const formattedBookings = bookings.map(b => ({
      ...b,
      place: b.places,
      user: b.users,
      places: undefined,
      users: undefined
    }));

    console.log(`📋 Found ${formattedBookings.length} bookings for owner ${userId}`);

    res.json({
      success: true,
      count: formattedBookings.length,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Error fetching owner bookings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load bookings'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        places!place_id(id, name, images, location, contact),
        users!user_id(id, name, email, phone)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Format response
    booking.place = booking.places;
    booking.user = booking.users;
    delete booking.places;
    delete booking.users;

    // Ensure user can only access their own bookings
    const userId = req.user.id;
    if (booking.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/confirm
// @desc    Confirm booking (Owner only)
// @access  Private (Owner)
router.put('/:id/confirm', protect, async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`*, places!place_id(id, name, created_by)`)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the place
    const userId = req.user.id;
    const { data: ownedPlace } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', userId)
      .eq('place_id', booking.place_id)
      .single();

    const isOwner = ownedPlace || booking.places?.created_by === userId;

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status: ${booking.status}`
      });
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(`*, places!place_id(id, name, images, location), users!user_id(id, name, email, phone)`)
      .single();

    if (error) throw new Error(error.message);

    updated.place = updated.places;
    updated.user = updated.users;
    delete updated.places;
    delete updated.users;

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/complete
// @desc    Mark booking as completed (Owner only)
// @access  Private (Owner)
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`*, places!place_id(id, name, created_by)`)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    const userId = req.user.id;
    const { data: ownedPlace } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', userId)
      .eq('place_id', booking.place_id)
      .single();

    const isOwner = ownedPlace || booking.places?.created_by === userId;

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete booking with status: ${booking.status}`
      });
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        check_out: { status: true, time: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select(`*, places!place_id(id, name, images, location), users!user_id(id, name, email, phone)`)
      .single();

    if (error) throw new Error(error.message);

    updated.place = updated.places;
    updated.user = updated.users;
    delete updated.places;
    delete updated.users;

    res.json({
      success: true,
      message: 'Booking marked as completed',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking (Visitor or Owner)
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`*, places!place_id(id, name, created_by)`)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const userId = req.user.id;
    const isVisitor = booking.user_id === userId;

    const { data: ownedPlace } = await supabase
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', userId)
      .eq('place_id', booking.place_id)
      .single();

    const isOwner = ownedPlace || booking.places?.created_by === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isVisitor && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    const { data: updated, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: req.body.reason || (isVisitor ? 'Cancelled by visitor' : 'Cancelled by owner'),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select(`*, places!place_id(id, name, images, location), users!user_id(id, name, email, phone)`)
      .single();

    if (error) throw new Error(error.message);

    updated.place = updated.places;
    updated.user = updated.users;
    delete updated.places;
    delete updated.users;

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = {};
    if (req.body.status) updateData.status = req.body.status;
    updateData.updated_at = new Date().toISOString();

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`*, places!place_id(id, name, images, location), users!user_id(id, name, email, phone)`)
      .single();

    if (error) throw new Error(error.message);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.place = booking.places;
    booking.user = booking.users;
    delete booking.places;
    delete booking.users;

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
