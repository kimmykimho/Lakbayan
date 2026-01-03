const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateFare(vehicleType, distance) {
  const rates = { tricycle: { base: 50, perKm: 10 }, motorcycle: { base: 40, perKm: 8 }, van: { base: 100, perKm: 15 }, private_car: { base: 80, perKm: 12 } };
  const rate = rates[vehicleType] || rates.tricycle;
  return rate.base + (distance * rate.perKm);
}

// @route   POST /api/transport-requests
router.post('/', protect, async (req, res) => {
  try {
    const { vehicleType, pickup, destination, passengers, bookingId, notes } = req.body;

    if (!vehicleType || !pickup || !destination) {
      return res.status(400).json({ success: false, message: 'Vehicle type, pickup, and destination required' });
    }

    const vehicleTypeMapping = { 'car': 'private_car', 'private_car': 'private_car', 'tricycle': 'tricycle', 'motorcycle': 'motorcycle', 'van': 'van' };
    const mappedVehicleType = vehicleTypeMapping[vehicleType.toLowerCase()] || 'tricycle';

    const distance = calculateDistance(pickup.coordinates.lat, pickup.coordinates.lng, destination.coordinates.lat, destination.coordinates.lng);
    const estimatedFare = calculateFare(mappedVehicleType, distance);

    const result = await query(
      `INSERT INTO transport_requests (user_id, booking_id, vehicle_type, pickup, destination, passengers, notes, distance, fare, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW()) RETURNING *`,
      [req.user.id, bookingId || null, mappedVehicleType, JSON.stringify(pickup), JSON.stringify(destination), passengers || 1, notes, parseFloat(distance.toFixed(2)), parseFloat(estimatedFare.toFixed(2))]
    );

    res.status(201).json({ success: true, message: 'Transport request created', data: result.rows[0] });
  } catch (error) {
    console.error('Transport request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/transport-requests
router.get('/', protect, async (req, res) => {
  try {
    const requests = await queryAll(
      `SELECT tr.*, 
              u.name as user_name, u.phone as user_phone,
              du.name as driver_name, du.phone as driver_phone
       FROM transport_requests tr
       LEFT JOIN users u ON tr.user_id = u.id
       LEFT JOIN drivers d ON tr.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE tr.user_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/transport-requests/all
// @desc    Get all transport requests (for business owners and admins)
// @access  Private (Business Owner / Admin)
router.get('/all', protect, async (req, res) => {
  try {
    // Check if user is business owner or admin
    if (req.user.role !== 'business_owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view all requests' });
    }

    const requests = await queryAll(
      `SELECT tr.*, u.name as user_name, u.phone as user_phone, u.email as user_email,
              d.id as driver_db_id, du.name as driver_name, du.phone as driver_phone
       FROM transport_requests tr
       LEFT JOIN users u ON tr.user_id = u.id
       LEFT JOIN drivers d ON tr.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       ORDER BY tr.created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('Transport requests /all error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/transport-requests/driver
router.get('/driver', protect, authorize('driver'), async (req, res) => {
  try {
    const driver = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const requests = await queryAll(
      `SELECT tr.*, u.name as user_name, u.phone as user_phone
       FROM transport_requests tr
       LEFT JOIN users u ON tr.user_id = u.id
       WHERE tr.driver_id = $1 OR tr.status = 'pending'
       ORDER BY tr.created_at DESC`,
      [driver.id]
    );

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/transport-requests/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await queryOne('SELECT * FROM transport_requests WHERE id = $1', [req.params.id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/accept
router.put('/:id/accept', protect, authorize('driver'), async (req, res) => {
  try {
    const driver = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const request = await queryOne('SELECT status FROM transport_requests WHERE id = $1', [req.params.id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot accept request with status: ${request.status}` });
    }

    const result = await query(
      'UPDATE transport_requests SET driver_id = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [driver.id, 'accepted', req.params.id]
    );

    res.json({ success: true, message: 'Transport request accepted', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await query(
      'UPDATE transport_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }

    res.json({ success: true, message: 'Status updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await query(
      'UPDATE transport_requests SET status = $1, cancellation_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['cancelled', reason, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }

    res.json({ success: true, message: 'Transport request cancelled', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/update-status
// @desc    Update transport request status (driver workflow)
// @access  Private (Driver)
router.put('/:id/update-status', protect, authorize('driver'), async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status transitions
    const validStatuses = ['accepted', 'driver_enroute', 'arrived', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await query(
      'UPDATE transport_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }

    res.json({ success: true, message: 'Status updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/pickup-complete
// @desc    Mark pickup as complete - passenger picked up, start ride to destination
// @access  Private (Driver)
router.put('/:id/pickup-complete', protect, authorize('driver'), async (req, res) => {
  try {
    const request = await queryOne('SELECT status FROM transport_requests WHERE id = $1', [req.params.id]);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }

    if (request.status !== 'arrived') {
      return res.status(400).json({ success: false, message: `Cannot mark pickup complete from status: ${request.status}` });
    }

    const result = await query(
      `UPDATE transport_requests 
       SET status = 'in_progress', pickup_time = NOW(), updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Pickup complete - ride started', data: result.rows[0] });
  } catch (error) {
    console.error('Pickup complete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/transport-requests/:id/destination-arrived
// @desc    Mark destination arrival - trip completed with optional photo proof
// @access  Private (Driver)
router.put('/:id/destination-arrived', protect, authorize('driver'), async (req, res) => {
  try {
    const { photoUrl } = req.body;

    const request = await queryOne('SELECT status, photos FROM transport_requests WHERE id = $1', [req.params.id]);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Transport request not found' });
    }

    if (request.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: `Cannot complete trip from status: ${request.status}` });
    }

    // Add photo to photos array
    let photos = [];
    try {
      photos = typeof request.photos === 'string' ? JSON.parse(request.photos) : (request.photos || []);
    } catch (e) {
      photos = [];
    }

    if (photoUrl) {
      photos.push({
        url: photoUrl,
        type: 'destination_arrival',
        timestamp: new Date().toISOString()
      });
    }

    const result = await query(
      `UPDATE transport_requests 
       SET status = 'completed', dropoff_time = NOW(), photos = $1, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [JSON.stringify(photos), req.params.id]
    );

    res.json({ success: true, message: 'Trip completed successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Destination arrived error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
