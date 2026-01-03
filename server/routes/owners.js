const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query } = require('../config/neon');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/owners
// @desc    Get all owners (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const owners = await queryAll(
      `SELECT bo.*, u.id as user_db_id, u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       ORDER BY bo.created_at DESC`
    );

    const formatted = owners.map(o => ({
      ...o,
      user: { id: o.user_db_id, name: o.user_name, email: o.user_email, phone: o.user_phone, avatar: o.user_avatar }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/applications
// @desc    Get all business owner applications (Admin only)
// @access  Private/Admin
router.get('/applications', protect, authorize('admin'), async (req, res) => {
  try {
    const applications = await queryAll(
      `SELECT bo.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       ORDER BY bo.created_at DESC`
    );

    const formatted = applications.map(app => ({
      ...app,
      user: { id: app.user_id, name: app.user_name, email: app.user_email, phone: app.user_phone, avatar: app.user_avatar }
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('Error fetching owner applications:', error);
    res.json({ success: true, count: 0, data: [] });
  }
});

// @route   POST /api/owners/apply
// @desc    Apply to become a business owner
// @access  Private (Tourist)
router.post('/apply', protect, async (req, res) => {
  try {
    // Accept full formData object from frontend
    const { businessInfo, documents, address, location, operatingHours } = req.body;

    const existingApplication = await queryOne('SELECT id FROM business_owners WHERE user_id = $1', [req.user.id]);
    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied' });
    }

    // Store the complete application data in business_info JSONB column
    const applicationData = {
      businessInfo: businessInfo || {},
      documents: documents || [],
      address: address || {},
      location: location || {},
      operatingHours: operatingHours || {}
    };

    const result = await query(
      `INSERT INTO business_owners (user_id, business_info, verification_status, created_at, updated_at)
       VALUES ($1, $2, 'pending', NOW(), NOW()) RETURNING *`,
      [req.user.id, JSON.stringify(applicationData)]
    );

    res.status(201).json({ success: true, message: 'Application submitted', data: result.rows[0] });
  } catch (error) {
    console.error('Business owner apply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/my-application
// @desc    Get current user's business owner application
// @access  Private
router.get('/my-application', protect, async (req, res) => {
  console.log('📍 HIT: /owners/my-application route, user.id:', req.user?.id);
  try {
    const application = await queryOne(
      `SELECT bo.*, u.name as user_name, u.email as user_email
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       WHERE bo.user_id = $1`,
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

// @route   GET /api/owners/profile
// @desc    Get current owner profile (alias for /me, used by dashboard)
// @access  Private (Business Owner)
router.get('/profile', protect, authorize('business_owner'), async (req, res) => {
  try {
    let owner = await queryOne(
      `SELECT bo.*, u.name as user_name, u.email as user_email
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       WHERE bo.user_id = $1`,
      [req.user.id]
    );

    // Auto-create/heal: If user is business_owner but has no record, create one
    if (!owner) {
      const insertResult = await query(
        `INSERT INTO business_owners (user_id, status, verification_status, business_info) 
          VALUES ($1, 'active', 'approved', '{}') 
          RETURNING *`,
        [req.user.id]
      );
      const newRecord = insertResult.rows[0];
      // Fetch with user details again or construct object
      owner = {
        ...newRecord,
        user_name: req.user.name || 'Business Owner', // Fallback if not joined
        user_email: req.user.email
      };
    }

    const places = await queryAll('SELECT * FROM places WHERE owner_id = $1', [req.user.id]);
    owner.places = places;
    res.json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/statistics
// @desc    Get owner statistics
// @access  Private (Business Owner)
router.get('/statistics', protect, authorize('business_owner'), async (req, res) => {
  try {
    const places = await queryAll('SELECT id, name, status FROM places WHERE owner_id = $1', [req.user.id]);
    const placeIds = places.map(p => p.id);

    let totalBookings = 0;
    let totalReviews = 0;
    let totalRevenue = 0;

    if (placeIds.length > 0) {
      const bookingsResult = await queryOne('SELECT COUNT(*) as count FROM bookings WHERE place_id = ANY($1)', [placeIds]);
      const reviewsResult = await queryOne('SELECT COUNT(*) as count FROM reviews WHERE place_id = ANY($1)', [placeIds]);
      totalBookings = parseInt(bookingsResult?.count || 0);
      totalReviews = parseInt(reviewsResult?.count || 0);
    }

    res.json({
      success: true,
      data: {
        totalPlaces: places.length,
        totalBookings,
        totalReviews,
        totalRevenue,
        places
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/reviews
// @desc    Get reviews for owner's places
// @access  Private (Business Owner)
router.get('/reviews', protect, authorize('business_owner'), async (req, res) => {
  try {
    const places = await queryAll('SELECT id FROM places WHERE owner_id = $1', [req.user.id]);
    const placeIds = places.map(p => p.id);

    let reviews = [];
    if (placeIds.length > 0) {
      reviews = await queryAll(
        `SELECT r.*, u.name as user_name, u.avatar as user_avatar, p.name as place_name
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN places p ON r.place_id = p.id
         WHERE r.place_id = ANY($1)
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [placeIds]
      );
    }

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/me
// @desc    Get current owner profile
// @access  Private (Business Owner)
router.get('/me', protect, authorize('business_owner'), async (req, res) => {
  try {
    let owner = await queryOne(
      `SELECT bo.*, u.name as user_name, u.email as user_email
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       WHERE bo.user_id = $1`,
      [req.user.id]
    );

    // Auto-create/heal: If user is business_owner but has no record, create one
    if (!owner) {
      const insertResult = await query(
        `INSERT INTO business_owners (user_id, status, verification_status, business_info) 
          VALUES ($1, 'active', 'approved', '{}') 
          RETURNING *`,
        [req.user.id]
      );
      const newRecord = insertResult.rows[0];
      owner = {
        ...newRecord,
        user_name: req.user.name || 'Business Owner',
        user_email: req.user.email
      };
    }

    const places = await queryAll('SELECT * FROM places WHERE owner_id = $1', [req.user.id]);

    owner.places = places;
    res.json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/dashboard
// @desc    Get owner dashboard data
// @access  Private (Business Owner)
router.get('/dashboard', protect, authorize('business_owner'), async (req, res) => {
  try {
    const places = await queryAll('SELECT id, name, status FROM places WHERE owner_id = $1', [req.user.id]);
    const placeIds = places.map(p => p.id);

    let bookings = [];
    let reviews = [];
    if (placeIds.length > 0) {
      bookings = await queryAll('SELECT * FROM bookings WHERE place_id = ANY($1) ORDER BY created_at DESC LIMIT 10', [placeIds]);
      reviews = await queryAll('SELECT * FROM reviews WHERE place_id = ANY($1) ORDER BY created_at DESC LIMIT 10', [placeIds]);
    }

    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

    res.json({
      success: true,
      data: {
        totalPlaces: places.length,
        pendingBookings,
        confirmedBookings,
        totalReviews: reviews.length,
        recentBookings: bookings,
        recentReviews: reviews
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/owners/:id/approve
// @desc    Approve owner application
// @access  Private/Admin
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const owner = await queryOne('SELECT user_id FROM business_owners WHERE id = $1', [req.params.id]);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner application not found' });
    }

    await query(
      `UPDATE business_owners SET verification_status = 'approved', status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
       WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    await query('UPDATE users SET role = $1 WHERE id = $2', ['business_owner', owner.user_id]);

    res.json({ success: true, message: 'Owner application approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/owners/:id/reject
// @desc    Reject owner application
// @access  Private/Admin
router.put('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    await query(
      `UPDATE business_owners SET verification_status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Owner application rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/owners/:id
// @desc    Get owner by ID
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  console.log('📍 HIT: /owners/:id route, params.id:', req.params.id);
  try {
    const owner = await queryOne(
      `SELECT bo.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM business_owners bo
       LEFT JOIN users u ON bo.user_id = u.id
       WHERE bo.id = $1`,
      [req.params.id]
    );

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    owner.user = { name: owner.user_name, email: owner.user_email, phone: owner.user_phone };
    res.json({ success: true, data: owner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/owners/places/:id
// @desc    Update owner's place
// @access  Private (Business Owner)
router.put('/places/:id', protect, authorize('business_owner'), async (req, res) => {
  try {
    // Verify the place belongs to this owner
    const place = await queryOne('SELECT id FROM places WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found or not authorized' });
    }

    const updateData = req.body;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== 'id' && key !== '_id') {
        const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (typeof value === 'object' && value !== null) {
          fields.push(`${columnName} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${columnName} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE places SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ success: true, message: 'Place updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/owners/businesses/:id
// @desc    Update owner's business info
// @access  Private (Business Owner)
router.put('/businesses/:id', protect, authorize('business_owner'), async (req, res) => {
  try {
    const owner = await queryOne('SELECT id FROM business_owners WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Business not found or not authorized' });
    }

    const updateData = req.body;
    const result = await query(
      `UPDATE business_owners SET business_info = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(updateData), req.params.id]
    );

    res.json({ success: true, message: 'Business updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
