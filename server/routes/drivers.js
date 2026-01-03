const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/drivers
// @desc    Get all available drivers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const drivers = await queryAll(
      `SELECT d.*, u.name as user_name, u.avatar as user_avatar, u.phone as user_phone
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.status = 'active'
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.json({ success: true, count: 0, data: [] });
  }
});

// @route   POST /api/drivers/admin/create
// @desc    Create driver profile (Admin only)
// @access  Private/Admin
router.post('/admin/create', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId, vehicle, license, pricing, verified } = req.body;

    const existingDriver = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [userId]);
    if (existingDriver) {
      return res.status(400).json({ success: false, message: 'Driver profile already exists' });
    }

    const result = await query(
      `INSERT INTO drivers (user_id, vehicle, license, pricing, verification_status, status, approved_by, approved_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'approved', 'active', $5, NOW(), NOW(), NOW()) RETURNING *`,
      [userId, JSON.stringify(vehicle || {}), JSON.stringify(license || {}), JSON.stringify(pricing || { baseRate: 50 }), req.user.id]
    );

    await query('UPDATE users SET role = $1 WHERE id = $2', ['driver', userId]);

    res.status(201).json({ success: true, message: 'Driver profile created', data: result.rows[0] });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/drivers/apply
// @desc    Apply to become a driver
// @access  Private (Tourist)
router.post('/apply', protect, async (req, res) => {
  try {
    const { vehicle, license, serviceAreas, pricing } = req.body;

    // Validate required fields
    if (!vehicle || !vehicle.plateNumber || !license || !license.number) {
      return res.status(400).json({ success: false, message: 'Vehicle and license information are required' });
    }

    const existingApplication = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [req.user.id]);
    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied as a driver' });
    }

    const result = await query(
      `INSERT INTO drivers (user_id, vehicle, license, service_areas, pricing, verification_status, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'offline', NOW(), NOW()) RETURNING *`,
      [
        req.user.id,
        JSON.stringify(vehicle || {}),
        JSON.stringify(license || {}),
        JSON.stringify(serviceAreas || []),
        JSON.stringify(pricing || { baseRate: 50, perKilometer: 10, perMinute: 2 })
      ]
    );

    res.status(201).json({ success: true, message: 'Driver application submitted', data: result.rows[0] });
  } catch (error) {
    console.error('Driver apply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/applications
// @desc    Get all driver applications (Admin only)
// @access  Private/Admin
router.get('/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const drivers = await queryAll(
      `SELECT d.*, u.id as user_db_id, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC`
    );

    const formatted = drivers.map(d => ({
      ...d,
      user: { id: d.user_db_id, name: d.user_name, email: d.user_email, phone: d.user_phone }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/available
// @desc    Get available drivers
// @access  Public
router.get('/available', async (req, res) => {
  try {
    const drivers = await queryAll(
      `SELECT d.*, u.name as user_name, u.phone as user_phone, u.avatar as user_avatar
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.status = 'active' AND d.verification_status = 'approved'`
    );

    const formatted = drivers.map(d => ({
      ...d,
      user: { name: d.user_name, phone: d.user_phone, avatar: d.user_avatar }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/my-application
// @desc    Get current user's driver application
// @access  Private
router.get('/my-application', protect, async (req, res) => {
  console.log('📍 HIT: /drivers/my-application route, user.id:', req.user?.id);
  try {
    const application = await queryOne(
      `SELECT d.*, u.name as user_name, u.email as user_email
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [req.user.id]
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'No application found' });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/profile
// @desc    Get current driver profile (used by dashboard)
// @access  Private (Driver)
router.get('/profile', protect, authorize('driver'), async (req, res) => {
  try {
    const driver = await queryOne(
      `SELECT d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [req.user.id]
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/statistics
// @desc    Get driver statistics
// @access  Private (Driver)
router.get('/statistics', protect, authorize('driver'), async (req, res) => {
  try {
    const driver = await queryOne('SELECT id, statistics FROM drivers WHERE user_id = $1', [req.user.id]);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Get trip counts from bookings/transport_requests
    const tripsResult = await queryOne(
      'SELECT COUNT(*) as total FROM transport_requests WHERE driver_id = $1',
      [driver.id]
    );
    const completedResult = await queryOne(
      `SELECT COUNT(*) as total FROM transport_requests WHERE driver_id = $1 AND status = 'completed'`,
      [driver.id]
    );

    const stats = driver.statistics || {};
    stats.totalTrips = parseInt(tripsResult?.total || 0);
    stats.completedTrips = parseInt(completedResult?.total || 0);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/availability
// @desc    Update driver availability status
// @access  Private (Driver)
router.put('/availability', protect, authorize('driver'), async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const result = await query(
      `UPDATE drivers SET availability = jsonb_set(COALESCE(availability, '{}'), '{isAvailable}', $1::jsonb), updated_at = NOW() 
       WHERE user_id = $2 RETURNING *`,
      [JSON.stringify(isAvailable), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, message: isAvailable ? 'You are now available' : 'You are now offline', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/me
// @desc    Get current driver profile
// @access  Private (Driver)
router.get('/me', protect, async (req, res) => {
  try {
    const driver = await queryOne(
      `SELECT d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.user_id = $1`,
      [req.user.id]
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    driver.user = { name: driver.user_name, email: driver.user_email, phone: driver.user_phone };
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/toggle-availability
// @desc    Toggle driver availability
// @access  Private (Driver)
router.put('/toggle-availability', protect, authorize('driver'), async (req, res) => {
  try {
    const driver = await queryOne('SELECT id, is_available FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const newStatus = !driver.is_available;
    const result = await query(
      'UPDATE drivers SET is_available = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, driver.id]
    );

    res.json({ success: true, message: `Availability ${newStatus ? 'enabled' : 'disabled'}`, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/location
// @desc    Update driver location
// @access  Private (Driver)
router.put('/location', protect, authorize('driver'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await query(
      `UPDATE drivers SET current_location = $1, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify({ latitude, longitude }), req.user.id]
    );
    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/drivers/:id
// @desc    Get driver by ID
// @access  Public
router.get('/:id', async (req, res) => {
  console.log('📍 HIT: /drivers/:id route, params.id:', req.params.id);
  try {
    const driver = await queryOne(
      `SELECT d.*, u.name as user_name, u.phone as user_phone, u.avatar as user_avatar
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.user = { name: driver.user_name, phone: driver.user_phone, avatar: driver.user_avatar };
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/:id/approve
// @desc    Approve driver application
// @access  Private/Admin
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE drivers SET verification_status = 'approved', status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', ['driver', result.rows[0].user_id]);

    res.json({ success: true, message: 'Driver approved', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/:id/reject
// @desc    Reject driver application
// @access  Private/Admin
router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE drivers SET verification_status = 'rejected', status = 'inactive', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, message: 'Driver rejected', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/:id
// @desc    Update driver profile
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
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, message: 'Driver updated', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/drivers/location
// @desc    Update driver's current GPS location
// @access  Private (Driver)
router.put('/location', protect, authorize('driver'), async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    // Get driver ID
    const driver = await queryOne('SELECT id FROM drivers WHERE user_id = $1', [req.user.id]);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Update driver's location in drivers table
    const locationData = {
      coordinates: { lat: latitude, lng: longitude },
      address: address || null,
      lastUpdated: new Date().toISOString()
    };

    await query(
      `UPDATE drivers SET location = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(locationData), driver.id]
    );

    // Also update any active transport request with driver's location
    // This is what the user's TrackTransport.jsx will poll to see driver's position
    const activeRequest = await queryOne(
      `SELECT id FROM transport_requests 
       WHERE driver_id = $1 AND status IN ('accepted', 'driver_enroute', 'arrived', 'in_progress')`,
      [driver.id]
    );

    if (activeRequest) {
      await query(
        `UPDATE transport_requests 
         SET driver_location = $1, updated_at = NOW() 
         WHERE id = $2`,
        [JSON.stringify(locationData), activeRequest.id]
      );
    }

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
