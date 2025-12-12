const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

// Helper to generate slug from title
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};

// @route   GET /api/about
// @desc    Get all about items (public) - optimized
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, featured, limit } = req.query;

        // Default limit to prevent large queries
        const queryLimit = Math.min(parseInt(limit) || 30, 50);

        // Select only necessary fields for list view
        let query = supabase
            .from('about_items')
            .select('id, title, slug, description, images, category, featured, status, event_date, created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(queryLimit);

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        if (featured === 'true') {
            query = query.eq('featured', true);
        }

        const { data: items, error } = await query;

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            count: items?.length || 0,
            data: items || []
        });
    } catch (error) {
        console.error('Error fetching about items:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});


// @route   GET /api/about/:id
// @desc    Get single about item by ID or slug
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if id is UUID or slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let query = supabase.from('about_items').select('*');

        if (isUUID) {
            query = query.eq('id', id);
        } else {
            query = query.eq('slug', id);
        }

        const { data: item, error } = await query.single();

        if (error || !item) {
            return res.status(404).json({
                success: false,
                message: 'About item not found'
            });
        }

        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        console.error('Error fetching about item:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/about
// @desc    Create new about item
// @access  Admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const {
            title,
            description,
            images,
            video_urls,
            external_links,
            category,
            featured
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        const slug = generateSlug(title);

        const { data: newItem, error } = await supabaseAdmin
            .from('about_items')
            .insert([{
                title,
                slug,
                description,
                images: images || [],
                video_urls: video_urls || [],
                external_links: external_links || [],
                category: category || 'heritage',
                featured: featured || false,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.status(201).json({
            success: true,
            message: 'About item created successfully',
            data: newItem
        });
    } catch (error) {
        console.error('Error creating about item:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/about/:id
// @desc    Update about item
// @access  Admin only
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            images,
            video_urls,
            external_links,
            category,
            featured,
            status
        } = req.body;

        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (title) {
            updateData.title = title;
            updateData.slug = generateSlug(title);
        }
        if (description !== undefined) updateData.description = description;
        if (images !== undefined) updateData.images = images;
        if (video_urls !== undefined) updateData.video_urls = video_urls;
        if (external_links !== undefined) updateData.external_links = external_links;
        if (category !== undefined) updateData.category = category;
        if (featured !== undefined) updateData.featured = featured;
        if (status !== undefined) updateData.status = status;

        const { data: updatedItem, error } = await supabaseAdmin
            .from('about_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: 'About item not found'
            });
        }

        res.json({
            success: true,
            message: 'About item updated successfully',
            data: updatedItem
        });
    } catch (error) {
        console.error('Error updating about item:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/about/:id
// @desc    Delete about item
// @access  Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('about_items')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        res.json({
            success: true,
            message: 'About item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting about item:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
