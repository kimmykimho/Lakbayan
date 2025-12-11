const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize, admin } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar, preferences, stats, is_active, last_login, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's own profile
// @access  Private (Any authenticated user)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, location, avatar, preferences } = req.body;

    // Build update object with only provided fields
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (preferences !== undefined) updateData.preferences = preferences;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, name, email, role, phone, location, avatar, preferences, stats, is_active')
      .single();

    if (error) throw new Error(error.message);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// @route   GET /api/users/:id/details
// @desc    Get user details with profile (Admin only)
// @access  Private/Admin
router.get('/:id/details', protect, authorize('admin'), async (req, res) => {
  try {
    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password from response
    delete user.password;

    let profile = null;

    // Get role-specific profile
    if (user.role === 'business_owner') {
      const { data: owner } = await supabase
        .from('business_owners')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = owner;
    } else if (user.role === 'driver') {
      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = driver;
    }

    // Get owned places
    const { data: ownedPlaces } = await supabase
      .from('user_owned_places')
      .select('place_id, places(id, name, category, images, status, location, pricing)')
      .eq('user_id', user.id);

    res.json({
      success: true,
      data: {
        user,
        profile,
        ownedPlaces: ownedPlaces?.map(op => op.places) || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/create
// @desc    Create new user with role (Admin only)
// @access  Private/Admin
router.post('/create', protect, authorize('admin'), async (req, res) => {
  try {
    const { email, role, name } = req.body;
    const bcrypt = require('bcryptjs');

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Validate role
    const validRoles = ['tourist', 'business_owner', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: tourist, business_owner, driver, admin'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate a temporary password
    const tempPassword = 'Welcome123!';
    const displayName = name || email.split('@')[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user in database using supabaseAdmin to bypass RLS
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name: displayName,
        role,
        password: hashedPassword,
        is_active: true
      })
      .select('id, email, name, role, is_active')
      .single();

    if (error) throw new Error(error.message);

    // If user is business_owner, create BusinessOwner profile using supabaseAdmin
    if (role === 'business_owner') {
      await supabaseAdmin
        .from('business_owners')
        .insert({
          user_id: user.id,
          verified: true,
          verification_status: 'approved',
          status: 'active',
          approved_by: req.user.id,
          approved_at: new Date().toISOString(),
          business_info: {
            email: user.email,
            businessName: `${user.name}'s Business`
          }
        });
    }

    res.status(201).json({
      success: true,
      message: `User created successfully with role: ${role}. Temporary password: ${tempPassword}`,
      data: {
        user,
        tempPassword
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/favorites/:placeId
// @desc    Add place to favorites
// @access  Private
router.post('/:id/favorites/:placeId', protect, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add to favorites (upsert to handle duplicates)
    await supabase
      .from('user_favorites')
      .upsert({
        user_id: req.params.id,
        place_id: req.params.placeId
      });

    // Get updated favorites
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('place_id, places(id, name, images, rating)')
      .eq('user_id', req.params.id);

    res.json({
      success: true,
      message: 'Added to favorites',
      data: favorites?.map(f => f.places) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/users/:id/favorites/:placeId
// @desc    Remove place from favorites
// @access  Private
router.delete('/:id/favorites/:placeId', protect, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', req.params.id)
      .eq('place_id', req.params.placeId);

    // Get updated favorites
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select('place_id, places(id, name, images, rating)')
      .eq('user_id', req.params.id);

    res.json({
      success: true,
      message: 'Removed from favorites',
      data: favorites?.map(f => f.places) || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password; // Don't allow password updates here
    updateData.updated_at = new Date().toISOString();

    // Use supabaseAdmin to bypass RLS for admin operations
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, name, email, role, phone, avatar, preferences, stats, is_active')
      .single();

    if (error) throw new Error(error.message);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🗑️ Deleting user and related data:', userId);

    // 1. Delete user's reviews
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('user_id', userId);
    if (reviewsError) console.log('⚠️ Reviews delete error (may not exist):', reviewsError.message);

    // 2. Delete user's bookings
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('user_id', userId);
    if (bookingsError) console.log('⚠️ Bookings delete error (may not exist):', bookingsError.message);

    // 3. Delete user's favorites
    const { error: favoritesError } = await supabaseAdmin
      .from('user_favorites')
      .delete()
      .eq('user_id', userId);
    if (favoritesError) console.log('⚠️ Favorites delete error (may not exist):', favoritesError.message);

    // 4. Delete business_owners record if exists
    const { error: ownerError } = await supabaseAdmin
      .from('business_owners')
      .delete()
      .eq('user_id', userId);
    if (ownerError) console.log('⚠️ Business owner delete error (may not exist):', ownerError.message);

    // 5. Get driver id first (if user is a driver)
    const { data: driverData } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();

    // 5a. Delete transport_requests where this user is the driver
    if (driverData) {
      const { error: transportDriverError } = await supabaseAdmin
        .from('transport_requests')
        .delete()
        .eq('driver_id', driverData.id);
      if (transportDriverError) console.log('⚠️ Transport requests (as driver) delete error:', transportDriverError.message);
    }

    // 5b. Delete transport_requests where this user is the requester
    const { error: transportUserError } = await supabaseAdmin
      .from('transport_requests')
      .delete()
      .eq('user_id', userId);
    if (transportUserError) console.log('⚠️ Transport requests (as user) delete error:', transportUserError.message);

    // 5c. Delete driver record if exists
    const { error: driverError } = await supabaseAdmin
      .from('drivers')
      .delete()
      .eq('user_id', userId);
    if (driverError) console.log('⚠️ Driver delete error (may not exist):', driverError.message);

    // 6. Get places owned by this user before deleting ownership records
    const { data: ownedPlaces } = await supabaseAdmin
      .from('user_owned_places')
      .select('place_id')
      .eq('user_id', userId);

    // 7. Delete user_owned_places records
    const { error: ownedPlacesError } = await supabaseAdmin
      .from('user_owned_places')
      .delete()
      .eq('user_id', userId);
    if (ownedPlacesError) console.log('⚠️ Owned places delete error (may not exist):', ownedPlacesError.message);

    // 8. Delete reviews on user's places (if any)
    if (ownedPlaces && ownedPlaces.length > 0) {
      const placeIds = ownedPlaces.map(p => p.place_id);

      // Delete reviews for these places
      const { error: placeReviewsError } = await supabaseAdmin
        .from('reviews')
        .delete()
        .in('place_id', placeIds);
      if (placeReviewsError) console.log('⚠️ Place reviews delete error:', placeReviewsError.message);

      // Delete bookings for these places
      const { error: placeBookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .in('place_id', placeIds);
      if (placeBookingsError) console.log('⚠️ Place bookings delete error:', placeBookingsError.message);
    }

    // 9. Delete places created by this user
    const { error: placesError } = await supabaseAdmin
      .from('places')
      .delete()
      .eq('created_by', userId);
    if (placesError) console.log('⚠️ Places delete error (may not exist):', placesError.message);

    // 10. Finally delete the user
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw new Error(error.message);

    console.log('✅ User and all related data deleted successfully');

    res.json({
      success: true,
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    console.error('❌ User deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/place
// @desc    Create place for business owner (Admin only)
// @access  Private/Admin
router.post('/:id/place', protect, authorize('admin'), async (req, res) => {
  try {
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, role, name, email')
      .eq('id', req.params.id)
      .single();

    if (!user || user.role !== 'business_owner') {
      return res.status(400).json({
        success: false,
        message: 'User is not a business owner'
      });
    }

    // Check/create BusinessOwner profile
    let { data: owner } = await supabase
      .from('business_owners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!owner) {
      const { data: newOwner } = await supabase
        .from('business_owners')
        .insert({
          user_id: user.id,
          verified: true,
          verification_status: 'approved',
          status: 'active',
          approved_by: req.user.id,
          approved_at: new Date().toISOString(),
          business_info: {
            email: user.email,
            businessName: `${user.name}'s Business`
          }
        })
        .select('id')
        .single();
      owner = newOwner;
    }

    // Generate slug
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    // Prepare place data with camelCase to snake_case conversion
    const placeData = { ...req.body };

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

    // Create the place
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
    // Remove any fields that don't exist in DB schema
    const invalidFields = ['ownerEmail', 'createdBy'];
    invalidFields.forEach(field => delete placeData[field]);

    // Debug: Log the place data being inserted
    console.log('📍 Creating place with data:', JSON.stringify({
      ...placeData,
      slug,
      created_by: user.id,
      status: 'active'
    }, null, 2));

    const { data: place, error } = await supabaseAdmin
      .from('places')
      .insert({
        ...placeData,
        slug,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Place creation failed:', error);
      throw new Error(error.message);
    }

    console.log('✅ Place created successfully:', place.id);

    // Add to user owned places
    await supabaseAdmin
      .from('user_owned_places')
      .insert({ user_id: user.id, place_id: place.id });

    res.status(201).json({
      success: true,
      message: 'Place created successfully',
      data: place
    });
  } catch (error) {
    console.error('Place creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/business
// @desc    Create business for business owner (Admin only)
// @access  Private/Admin
router.post('/:id/business', protect, authorize('admin'), async (req, res) => {
  try {
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, role, name, email')
      .eq('id', req.params.id)
      .single();

    if (!user || user.role !== 'business_owner') {
      return res.status(400).json({
        success: false,
        message: 'User is not a business owner'
      });
    }

    // Check/create BusinessOwner profile
    let { data: owner } = await supabase
      .from('business_owners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!owner) {
      await supabase
        .from('business_owners')
        .insert({
          user_id: user.id,
          verified: true,
          verification_status: 'approved',
          status: 'active',
          approved_by: req.user.id,
          approved_at: new Date().toISOString(),
          business_info: {
            email: user.email,
            businessName: `${user.name}'s Business`
          }
        });
    }

    // Create the business
    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        ...req.body,
        owner_id: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: business
    });
  } catch (error) {
    console.error('Business creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
