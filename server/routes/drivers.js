const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/drivers/admin/create
// @desc    Create driver profile (Admin only)
// @access  Private/Admin
router.post('/admin/create', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId, vehicle, license, pricing, verified, verificationStatus } = req.body;

    // Check if driver profile already exists
    const { data: existingDriver } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver profile already exists for this user'
      });
    }

    // Create driver profile
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .insert({
        user_id: userId,
        vehicle,
        license,
        pricing: pricing || { baseRate: 50, perKilometer: 10, perMinute: 2 },
        verified: verified !== undefined ? verified : true,
        verification_status: verificationStatus || 'approved',
        status: 'active',
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update user role to driver
    await supabaseAdmin
      .from('users')
      .update({ role: 'driver' })
      .eq('id', userId);

    res.status(201).json({
      success: true,
      message: 'Driver profile created successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error creating driver profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/applications
// @desc    Get all driver applications (Admin only)
// @access  Private/Admin
router.get('/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('drivers')
      .select(`*, users!user_id(id, name, email, phone, avatar)`)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('verification_status', status);
    }

    const { data: applications, error } = await query;

    if (error) throw new Error(error.message);

    const formatted = applications.map(app => ({
      ...app,
      user: app.users,
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

// @route   PUT /api/drivers/applications/:id/approve
// @desc    Approve a driver application
// @access  Private/Admin
router.put('/applications/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get the application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('drivers')
      .select('*, users!user_id(id, name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status
    const { error: updateError } = await supabaseAdmin
      .from('drivers')
      .update({
        verification_status: 'approved',
        verified: true,
        status: 'active',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);

    // Update user role to driver
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ role: 'driver' })
      .eq('id', application.user_id);

    if (userError) throw new Error(userError.message);

    res.json({
      success: true,
      message: 'Application approved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/drivers/applications/:id/reject
// @desc    Reject a driver application
// @access  Private/Admin
router.put('/applications/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Update application status
    const { error } = await supabaseAdmin
      .from('drivers')
      .update({
        verification_status: 'rejected',
        verified: false,
        rejection_reason: reason || 'No reason provided'
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Application rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/drivers/apply
// @desc    Apply to become a driver
// @access  Private (Tourist)
router.post('/apply', protect, async (req, res) => {
  try {
    const { vehicle, license, documents, serviceAreas, pricing } = req.body;

    // Check if user already applied
    const { data: existingApplication } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied. Please wait for admin approval.'
      });
    }

    // Create driver application using supabaseAdmin to bypass RLS
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .insert({
        user_id: req.user.id,
        vehicle,
        license,
        documents: documents || [],
        service_areas: serviceAreas || [],
        pricing: pricing || { baseRate: 50, perKilometer: 10, perMinute: 2 },
        verification_status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Please wait for admin approval.',
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/my-application
// @desc    Get current user's driver application
// @access  Private
router.get('/my-application', protect, async (req, res) => {
  try {
    const { data: application, error } = await supabaseAdmin
      .from('drivers')
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

// @route   GET /api/drivers
// @desc    Get all available drivers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        id, vehicle, rating, availability, location, pricing, status,
        users!user_id(id, name, email, phone, avatar)
      `)
      .eq('verified', true)
      .eq('verification_status', 'approved')
      .eq('status', 'active');

    if (error) throw new Error(error.message);

    // Filter for available drivers and format
    const availableDrivers = drivers
      .filter(d => d.availability?.isAvailable !== false)
      .map(d => ({
        ...d,
        user: d.users,
        users: undefined
      }));

    res.json({
      success: true,
      count: availableDrivers.length,
      data: availableDrivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/profile
// @desc    Get driver profile
// @access  Private (Driver)
router.get('/profile', protect, authorize('driver'), async (req, res) => {
  try {
    // Use supabaseAdmin to bypass RLS
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .select(`
        *,
        users!user_id(id, name, email, phone, avatar)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (error || !driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    driver.user = driver.users;
    delete driver.users;

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/drivers/profile
// @desc    Update driver profile
// @access  Private (Driver)
router.put('/profile', protect, authorize('driver'), async (req, res) => {
  try {
    const { vehicle, license, availability, pricing, bankDetails } = req.body;

    const { data: currentDriver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!currentDriver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (vehicle) updateData.vehicle = { ...currentDriver.vehicle, ...vehicle };
    if (license) updateData.license = { ...currentDriver.license, ...license };
    if (availability) updateData.availability = { ...currentDriver.availability, ...availability };
    if (pricing) updateData.pricing = { ...currentDriver.pricing, ...pricing };
    if (bankDetails) updateData.bank_details = { ...currentDriver.bank_details, ...bankDetails };

    const { data: driver, error } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/drivers/location
// @desc    Update driver location
// @access  Private (Driver)
router.put('/location', protect, authorize('driver'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const { error } = await supabase
      .from('drivers')
      .update({
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          lastUpdated: new Date().toISOString()
        }
      })
      .eq('user_id', req.user.id);

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/drivers/availability
// @desc    Toggle driver availability
// @access  Private (Driver)
router.put('/availability', protect, authorize('driver'), async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const { data: currentDriver } = await supabase
      .from('drivers')
      .select('availability')
      .eq('user_id', req.user.id)
      .single();

    const { data: driver, error } = await supabase
      .from('drivers')
      .update({
        availability: {
          ...currentDriver?.availability,
          isAvailable
        },
        status: isAvailable ? 'active' : 'offline'
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: `You are now ${isAvailable ? 'available' : 'unavailable'}`,
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/applications
// @desc    Get all driver applications (Admin)
// @access  Private (Admin)
router.get('/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;

    // Use supabaseAdmin to bypass RLS and fetch all applications
    let query = supabaseAdmin
      .from('drivers')
      .select(`
        *,
        users!user_id(id, name, email, phone, avatar)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('verification_status', status);
    }

    const { data: applications, error } = await query;

    if (error) throw new Error(error.message);

    const formattedApps = applications.map(a => ({
      ...a,
      user: a.users,
      users: undefined
    }));

    res.json({
      success: true,
      count: formattedApps.length,
      data: formattedApps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/drivers/applications/:id/approve
// @desc    Approve driver application
// @access  Private (Admin)
router.put('/applications/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    // Get driver info first
    const { data: driver } = await supabaseAdmin
      .from('drivers')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update driver
    const { data: updated, error } = await supabaseAdmin
      .from('drivers')
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

    // Update user role to driver
    await supabaseAdmin
      .from('users')
      .update({ role: 'driver' })
      .eq('id', driver.user_id);

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

// @route   PUT /api/drivers/applications/:id/reject
// @desc    Reject driver application
// @access  Private (Admin)
router.put('/applications/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .update({
        verification_status: 'rejected',
        verified: false,
        rejection_reason: reason || 'Application does not meet requirements'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application rejected',
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/nearby
// @desc    Find nearby available drivers
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // For now, get all available drivers (geospatial filtering would need PostGIS)
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        id, vehicle, rating, location,
        users!user_id(id, name, avatar)
      `)
      .eq('status', 'active')
      .eq('verified', true)
      .limit(20);

    if (error) throw new Error(error.message);

    const formattedDrivers = drivers.map(d => ({
      ...d,
      user: d.users,
      users: undefined
    }));

    res.json({
      success: true,
      count: formattedDrivers.length,
      data: formattedDrivers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/drivers/statistics
// @desc    Get driver statistics
// @access  Private (Driver)
router.get('/statistics', protect, authorize('driver'), async (req, res) => {
  try {
    // Use supabaseAdmin to bypass RLS
    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .select('statistics')
      .eq('user_id', req.user.id)
      .single();

    if (error || !driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    res.json({
      success: true,
      data: driver.statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
