const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/businesses
// @desc    Get all businesses
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        *,
        users!owner_id(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Format response
    const formattedBusinesses = businesses.map(b => ({
      ...b,
      owner: b.users,
      users: undefined
    }));

    res.json({
      success: true,
      count: formattedBusinesses.length,
      data: formattedBusinesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/businesses
// @desc    Register new business
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const businessData = { ...req.body };

    // If ownerEmail is provided, find and link the user
    if (req.body.ownerEmail) {
      const { data: owner } = await supabase
        .from('users')
        .select('id')
        .eq('email', req.body.ownerEmail.toLowerCase())
        .single();

      if (owner) {
        businessData.owner_id = owner.id;
      } else {
        console.log(`⚠️ Owner email ${req.body.ownerEmail} not found, using current user as owner`);
        businessData.owner_id = req.user.id;
      }

      delete businessData.ownerEmail;
    } else {
      businessData.owner_id = req.user.id;
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Business registered successfully',
      data: business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/businesses/my
// @desc    Get user's businesses
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', req.user.id);

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      count: businesses.length,
      data: businesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/businesses/:id
// @desc    Update business
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    updateData.updated_at = new Date().toISOString();

    const { data: business, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.json({
      success: true,
      message: 'Business updated successfully',
      data: business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/businesses/:id
// @desc    Delete business
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
