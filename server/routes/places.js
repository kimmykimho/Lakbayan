const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query, queryCached, invalidateCache } = require('../config/neon');
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
// @desc    Get all places with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, status, featured, sort, limit, search, page = 1 } = req.query;

    const queryLimit = Math.min(parseInt(limit) || 12, 30);
    const offset = (parseInt(page) - 1) * queryLimit;

    // Use cache for default queries (no search, no special filters)
    const cacheKey = `places:${category || 'all'}:${featured || 'false'}:${page}`;
    const useCache = !search && !status;

    let places;
    if (useCache) {
      // Only get first image for list view (full images = 12+ MB each!)
      places = await queryCached(cacheKey,
        `SELECT id, name, slug, category, location, 
                images->>0 as image, rating, visitors, featured, status 
         FROM places WHERE status = 'active' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [queryLimit, offset], 300000); // 5 minute cache
    } else {
      let sql = `SELECT id, name, slug, category, location, images->>0 as image, rating, visitors, featured, status 
                 FROM places WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
      } else {
        sql += ` AND status = $${paramIndex++}`;
        params.push('active');
      }

      if (featured === 'true') {
        sql += ` AND featured = true`;
      }
      if (category && category !== 'all') {
        sql += ` AND category = $${paramIndex++}`;
        params.push(category);
      }
      if (search) {
        sql += ` AND name ILIKE $${paramIndex++}`;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(queryLimit, offset);

      places = await queryAll(sql, params);
    }

    // Sort by JSONB fields in JavaScript if requested
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



// @route   GET /api/places/admin/all
// @desc    Get all places with details for admin (cached, optimized)
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    // Use same optimization as public route: cache + first image only
    const places = await queryCached('admin:places:all',
      `SELECT id, name, slug, category, location, 
              images->>0 as image, rating, visitors, featured, status,
              created_at, updated_at
       FROM places ORDER BY created_at DESC`,
      [], 60000); // 1 minute cache for admin

    // Format images as array for frontend compatibility
    const formatted = places.map(p => ({
      ...p,
      images: p.image ? [p.image] : []
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('Error fetching admin places:', error);
    res.status(500).json({ success: false, message: error.message });
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

    const place = await queryOne(`
      SELECT p.*, u.email as owner_email 
      FROM places p 
      LEFT JOIN users u ON p.owner_id = u.id 
      WHERE p.id = $1
    `, [req.params.id]);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

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
      const owner = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1', [req.body.ownerEmail.toLowerCase()]);

      if (owner) {
        placeData.owner_id = owner.id;
      } else {
        console.log(`⚠️ Owner email ${req.body.ownerEmail} not found, using admin as creator`);
        placeData.owner_id = req.user.id;
      }

      delete placeData.ownerEmail;
    } else {
      placeData.owner_id = req.user.id;
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

    // Build insert query for Neon
    const columns = Object.keys(placeData).filter(k => placeData[k] !== undefined);
    const values = columns.map(k => {
      const v = placeData[k];
      return typeof v === 'object' ? JSON.stringify(v) : v;
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const insertResult = await query(
      `INSERT INTO places (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    const place = insertResult.rows[0];

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
      const existingPlace = await queryOne('SELECT owner_id FROM places WHERE id = $1', [req.params.id]);

      if (req.body.ownerEmail) {
        // Find new owner
        const newOwner = await queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [req.body.ownerEmail]);

        if (newOwner) {
          placeData.owner_id = newOwner.id;

          // Remove from old owner's owned places (user_owned_places table may not exist)
          // Skip this for now as it's optional
        }
      } else {
        // Remove owner relationship
        placeData.owner_id = null;
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
    // Valid database columns - columns that exist in places table after migrations
    const validColumns = [
      'name', 'slug', 'description', 'category', 'images', 'location',
      'contact', 'hours', 'pricing', 'menu', 'accommodation', 'shop',
      'entertainment', 'services', 'amenities', 'activities', 'highlights',
      'rating', 'visitors', 'best_time_to_visit', 'accessibility',
      'status', 'featured', 'virtual_tour', 'owner_id', 'created_by', 'updated_at'
    ];

    // Build update query for Neon
    const updateKeys = Object.keys(placeData).filter(k =>
      placeData[k] !== undefined && k !== 'id' && validColumns.includes(k)
    );

    console.log('📝 Update place request:', {
      id: req.params.id,
      receivedFields: Object.keys(req.body),
      filteredFields: updateKeys,
      placeDataKeys: Object.keys(placeData)
    });

    if (updateKeys.length === 0) {
      console.log('❌ No valid fields to update. Received:', Object.keys(placeData));
      return res.status(400).json({ success: false, message: 'No valid fields to update', received: Object.keys(req.body) });
    }

    const setClause = updateKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    // TEXT[] columns need PostgreSQL array format {a,b,c}, JSONB columns need JSON.stringify
    const textArrayColumns = ['amenities', 'activities', 'highlights', 'services'];
    const values = updateKeys.map(k => {
      const v = placeData[k];
      if (textArrayColumns.includes(k)) {
        // Convert JavaScript array to PostgreSQL array literal format: {item1,item2}
        if (Array.isArray(v) && v.length > 0) {
          return '{' + v.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',') + '}';
        }
        return '{}'; // Empty array
      }

      // Handle null explicitly to avoid JSON.stringify(null) -> "null" string
      if (v === null) return null;

      // For JSONB and other objects, stringify
      return typeof v === 'object' ? JSON.stringify(v) : v;
    });
    values.push(req.params.id);

    const updateResult = await query(
      `UPDATE places SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );

    const place = updateResult.rows[0];

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Invalidate all places caches so fresh data is loaded
    invalidateCache('admin:places:all');
    invalidateCache('places:all:false:1');
    invalidateCache('places:all:false:2');

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
    const place = await queryOne('SELECT id, name, owner_id FROM places WHERE id = $1', [req.params.id]);

    if (!place) {
      console.log('❌ Place not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Remove from user favorites
    await query('DELETE FROM user_favorites WHERE place_id = $1', [req.params.id]);

    // Delete reviews for this place
    await query('DELETE FROM reviews WHERE place_id = $1', [req.params.id]);

    // Get all bookings for this place to delete related transport requests
    const placeBookings = await queryAll('SELECT id FROM bookings WHERE place_id = $1', [req.params.id]);

    if (placeBookings && placeBookings.length > 0) {
      const bookingIds = placeBookings.map(b => b.id);
      // Delete transport requests linked to these bookings
      for (const bookingId of bookingIds) {
        await query('DELETE FROM transport_requests WHERE booking_id = $1', [bookingId]);
      }
    }

    // Delete bookings for this place
    await query('DELETE FROM bookings WHERE place_id = $1', [req.params.id]);

    // Delete the place
    await query('DELETE FROM places WHERE id = $1', [req.params.id]);

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
    const place = await queryOne('SELECT id, rating FROM places WHERE id = $1', [req.params.id]);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Create review
    const reviewResult = await query(
      `INSERT INTO reviews (place_id, user_id, rating, comment) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, rating, comment]
    );
    const review = reviewResult.rows[0];

    // Update place rating
    const reviews = await queryAll('SELECT rating FROM reviews WHERE place_id = $1', [req.params.id]);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await query(
      `UPDATE places SET rating = $1 WHERE id = $2`,
      [JSON.stringify({ average: Math.round(avgRating * 10) / 10, count: reviews.length }), req.params.id]
    );

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
