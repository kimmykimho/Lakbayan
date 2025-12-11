const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to calculate fare based on vehicle type and distance
function calculateFare(vehicleType, distance) {
  const rates = {
    tricycle: { base: 50, perKm: 10 },
    motorcycle: { base: 40, perKm: 8 },
    van: { base: 100, perKm: 15 },
    private_car: { base: 80, perKm: 12 }
  };

  const rate = rates[vehicleType] || rates.tricycle;
  return rate.base + (distance * rate.perKm);
}

// @route   POST /api/transport-requests
// @desc    Create transport request
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { vehicleType, pickup, destination, passengers, bookingId, notes } = req.body;

    if (!vehicleType || !pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type, pickup, and destination are required'
      });
    }

    // Map frontend vehicle types to database-valid values
    const vehicleTypeMapping = {
      'car': 'private_car',
      'private_car': 'private_car',
      'tricycle': 'tricycle',
      'motorcycle': 'motorcycle',
      'van': 'van',
      'habal-habal': 'motorcycle',
      'jeepney': 'van'
    };
    const mappedVehicleType = vehicleTypeMapping[vehicleType.toLowerCase()] || 'tricycle';

    const distance = calculateDistance(
      pickup.coordinates.lat, pickup.coordinates.lng,
      destination.coordinates.lat, destination.coordinates.lng
    );

    const estimatedFare = calculateFare(mappedVehicleType, distance);

    console.log('🚗 Creating transport request:', {
      user_id: req.user.id,
      vehicle_type: vehicleType,
      pickup: pickup?.address,
      destination: destination?.address,
      passengers,
      distance: distance.toFixed(2) + ' km',
      estimated_fare: estimatedFare
    });

    const { data: transportRequest, error } = await supabaseAdmin
      .from('transport_requests')
      .insert({
        user_id: req.user.id,
        booking_id: bookingId || null,
        vehicle_type: mappedVehicleType,
        pickup,
        destination,
        passengers: passengers || 1,
        notes,
        distance,
        fare: { estimated: estimatedFare },
        duration: { estimated: Math.ceil((distance / 30) * 60) },
        timeline: { requested: new Date().toISOString() }
      })
      .select(`*, users!user_id(id, name, email, phone)`)
      .single();

    if (error) {
      console.error('❌ Transport request error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Transport request created:', transportRequest.id);

    // Update booking with transport request if bookingId provided
    if (bookingId) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('transport')
        .eq('id', bookingId)
        .single();

      await supabaseAdmin
        .from('bookings')
        .update({
          transport: { ...booking?.transport, needed: true, vehicleType }
        })
        .eq('id', bookingId);
    }

    transportRequest.user = transportRequest.users;
    delete transportRequest.users;

    res.status(201).json({
      success: true,
      message: 'Transport request created successfully',
      data: transportRequest
    });
  } catch (error) {
    console.error('Error creating transport request:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/transport-requests
// @desc    Get user's transport requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('transport_requests')
      .select(`
        *,
        drivers!driver_id(id, vehicle, rating, user_id, users!user_id(name, email, phone)),
        bookings!booking_id(id, confirmation_code, place_id, visit_date)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = requests.map(r => ({
      ...r,
      driver: r.drivers ? { ...r.drivers, user: r.drivers.users } : null,
      booking: r.bookings,
      drivers: undefined,
      bookings: undefined
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

// @route   GET /api/transport-requests/all
// @desc    Get all transport requests (for business owners - requests going to their places)
// @access  Private (Business Owner)
router.get('/all', protect, authorize('business_owner'), async (req, res) => {
  try {
    console.log('📊 Fetching all transport requests for business owner:', req.user.id);

    // First get places owned by this business owner
    const { data: ownedPlaces } = await supabaseAdmin
      .from('places')
      .select('id')
      .eq('created_by', req.user.id);

    const placeIds = ownedPlaces?.map(p => p.id) || [];
    console.log('Found', placeIds.length, 'owned places');

    if (placeIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get transport requests where destination is one of the owner's places
    // or get bookings for owner's places that have transport requests
    const { data: requests, error } = await supabaseAdmin
      .from('transport_requests')
      .select(`
        *,
        users!user_id(id, name, email, phone),
        drivers!driver_id(id, vehicle, rating, users!user_id(name, phone)),
        bookings!booking_id(id, place_id, visit_date, places!place_id(id, name))
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Filter to only show requests going to owner's places (by checking booking.place_id)
    const filteredRequests = requests.filter(r => {
      const bookingPlaceId = r.bookings?.place_id;
      return placeIds.includes(bookingPlaceId);
    });

    const formatted = filteredRequests.map(r => ({
      ...r,
      user: r.users,
      driver: r.drivers ? { ...r.drivers, user: r.drivers.users } : null,
      booking: r.bookings,
      users: undefined,
      drivers: undefined,
      bookings: undefined
    }));

    console.log('✅ Found', formatted.length, 'transport requests for owner places');

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('Error fetching transport requests for owner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/transport-requests/driver
// @desc    Get driver's transport requests
// @access  Private (Driver)
router.get('/driver', protect, authorize('driver'), async (req, res) => {
  try {
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('id, vehicle')
      .eq('user_id', req.user.id)
      .single();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get requests assigned to this driver or pending
    const { data: requests, error } = await supabaseAdmin
      .from('transport_requests')
      .select(`
        *,
        users!user_id(id, name, email, phone),
        bookings!booking_id(id, place_id, visit_date)
      `)
      .or(`driver_id.eq.${driver.id},status.eq.pending`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = requests.map(r => ({
      ...r,
      user: r.users,
      booking: r.bookings,
      users: undefined,
      bookings: undefined
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

// @route   GET /api/transport-requests/:id
// @desc    Get single transport request
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: request, error } = await supabase
      .from('transport_requests')
      .select(`
        *,
        users!user_id(id, name, email, phone),
        drivers!driver_id(id, vehicle, rating, users!user_id(name, phone)),
        bookings!booking_id(id, confirmation_code, place_id)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !request) {
      return res.status(404).json({
        success: false,
        message: 'Transport request not found'
      });
    }

    request.user = request.users;
    request.driver = request.drivers;
    request.booking = request.bookings;
    delete request.users;
    delete request.drivers;
    delete request.bookings;

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport-requests/:id/accept
// @desc    Accept transport request (Driver)
// @access  Private (Driver)
router.put('/:id/accept', protect, authorize('driver'), async (req, res) => {
  try {
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const { data: request } = await supabaseAdmin
      .from('transport_requests')
      .select('status')
      .eq('id', req.params.id)
      .single();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Transport request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept request with status: ${request.status}`
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('transport_requests')
      .update({
        driver_id: driver.id,
        status: 'accepted',
        timeline: { ...request.timeline, accepted: new Date().toISOString() }
      })
      .eq('id', req.params.id)
      .select(`*, users!user_id(name, email, phone), drivers!driver_id(vehicle, rating)`)
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Transport request accepted',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport-requests/:id/status
// @desc    Update transport request status
// @access  Private (Driver)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;

    const { data: request } = await supabaseAdmin
      .from('transport_requests')
      .select('*, timeline')
      .eq('id', req.params.id)
      .single();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Transport request not found'
      });
    }

    const timeline = request.timeline || {};
    const timelineMap = {
      'driver_enroute': 'driverEnroute',
      'arrived': 'arrived',
      'in_progress': 'started',
      'completed': 'completed'
    };

    if (timelineMap[status]) {
      timeline[timelineMap[status]] = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
      .from('transport_requests')
      .update({ status, timeline })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update driver stats when completed
    if (status === 'completed' && request.driver_id) {
      const { data: driver } = await supabaseAdmin
        .from('drivers')
        .select('statistics')
        .eq('id', request.driver_id)
        .single();

      const stats = driver?.statistics || {};
      await supabaseAdmin
        .from('drivers')
        .update({
          statistics: {
            totalTrips: (stats.totalTrips || 0) + 1,
            completedTrips: (stats.completedTrips || 0) + 1,
            totalEarnings: (stats.totalEarnings || 0) + (request.fare?.final || request.fare?.estimated || 0)
          }
        })
        .eq('id', request.driver_id);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport-requests/:id/update-location
// @desc    Update driver's current location
// @access  Private (Driver)
router.put('/:id/update-location', protect, authorize('driver'), async (req, res) => {
  try {
    const { lat, lng, address } = req.body;

    const { data: request } = await supabase
      .from('transport_requests')
      .select('status, pickup, destination')
      .eq('id', req.params.id)
      .single();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Transport request not found'
      });
    }

    const driverLocation = {
      coordinates: { lat, lng },
      address: address || 'Current location',
      lastUpdated: new Date().toISOString()
    };

    let eta = {};
    if (request.status === 'driver_enroute') {
      const distance = calculateDistance(lat, lng, request.pickup.coordinates.lat, request.pickup.coordinates.lng);
      eta = { minutes: Math.ceil((distance / 30) * 60), lastCalculated: new Date().toISOString() };
    } else if (request.status === 'in_progress') {
      const distance = calculateDistance(lat, lng, request.destination.coordinates.lat, request.destination.coordinates.lng);
      eta = { minutes: Math.ceil((distance / 30) * 60), lastCalculated: new Date().toISOString() };
    }

    const { data: updated, error } = await supabase
      .from('transport_requests')
      .update({ driver_location: driverLocation, eta })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/transport-requests/:id/cancel
// @desc    Cancel transport request
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: request } = await supabaseAdmin
      .from('transport_requests')
      .select('user_id, driver_id, timeline')
      .eq('id', req.params.id)
      .single();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Transport request not found'
      });
    }

    const isUser = request.user_id === req.user.id;
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    const isDriver = driver && request.driver_id === driver.id;

    if (!isUser && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    const timeline = request.timeline || {};
    timeline.cancelled = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('transport_requests')
      .update({
        status: 'cancelled',
        timeline,
        cancellation_reason: reason,
        cancelled_by: isUser ? 'user' : 'driver'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Transport request cancelled',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
