const express = require('express');
const router = express.Router();
const { queryAll, queryOne, query, queryCached, invalidateCache } = require('../config/neon');
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
// @desc    Get all about items (public) - cached for performance
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, limit } = req.query;
        const queryLimit = Math.min(parseInt(limit) || 30, 50);

        // Use cache for about items - only first image (full images = MB of data!)
        const cacheKey = `about:${category || 'all'}`;

        // Select only columns that exist - new columns added via migration
        const items = await queryCached(cacheKey,
            `SELECT id, title, slug, short_description, content, images[1] as image, category, order_index, status, created_at 
             FROM about_items WHERE status = 'active' ORDER BY order_index ASC, created_at DESC LIMIT $1`,
            [queryLimit], 300000); // 5 minute cache

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

// @route   GET /api/about/admin/all
// @desc    Get all about items for admin (cached, optimized for LIST VIEW)
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        // For LIST view: only first image (fast loading)
        // Full data fetched separately when editing via GET /:id
        const items = await queryCached('admin:about:all',
            `SELECT id, title, slug, short_description, content, images[1] as image, category, order_index, status, created_at, updated_at 
             FROM about_items ORDER BY order_index ASC, created_at DESC`,
            [], 60000); // 1 minute cache for admin

        // Format for frontend compatibility
        const formatted = items.map(item => ({
            ...item,
            images: item.image ? [item.image] : [],
            // Ensure description is populated
            description: item.content || item.short_description || ''
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        console.error('Error fetching admin about items:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/about/:id
// @desc    Get single about item by ID or slug
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let item;
        if (isUUID) {
            item = await queryOne('SELECT * FROM about_items WHERE id = $1', [id]);
        } else {
            item = await queryOne('SELECT * FROM about_items WHERE slug = $1', [id]);
        }

        if (!item) {
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
        const { title, description, images, category, featured, video_urls, external_links, event_date } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        const slug = generateSlug(title);
        // Create short description from first 150 chars
        const short_description = description.length > 150 ? description.substring(0, 147) + '...' : description;

        // Prepare arrays/objects for JSONB/Array columns
        // Assuming video_urls is TEXT[] or JSONB, external_links is JSONB

        const result = await query(
            `INSERT INTO about_items (
                title, slug, short_description, content, images, category, 
                status, created_at, updated_at
            ) 
             VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW()) 
             RETURNING *`,
            [
                title,
                slug,
                short_description,
                description, // Save full description to content
                JSON.stringify(images || []),
                category || 'heritage',
            ]
        );

        invalidateCache('admin:about:all');
        invalidateCache('about:all');
        if (category) invalidateCache(`about:${category}`);

        res.status(201).json({
            success: true,
            message: 'About item created successfully',
            data: result.rows[0]
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
        const { title, description, images, category, featured, status, video_urls, external_links, event_date } = req.body;

        const updateFields = ['updated_at = NOW()'];
        const values = [];
        let paramIndex = 1;

        if (title) {
            updateFields.push(`title = $${paramIndex++}`);
            values.push(title);
            updateFields.push(`slug = $${paramIndex++}`);
            values.push(generateSlug(title));
        }
        if (description !== undefined) {
            updateFields.push(`content = $${paramIndex++}`);
            values.push(description);
            // Also update short_description
            updateFields.push(`short_description = $${paramIndex++}`);
            values.push(description.length > 150 ? description.substring(0, 147) + '...' : description);
        }
        if (images !== undefined) {
            updateFields.push(`images = $${paramIndex++}`);
            values.push(JSON.stringify(images));
        }
        if (category !== undefined) {
            updateFields.push(`category = $${paramIndex++}`);
            values.push(category);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        // Note: featured, video_urls, external_links, event_date removed until migration is run

        values.push(id);
        const result = await query(
            `UPDATE about_items SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'About item not found'
            });
        }

        invalidateCache('admin:about:all');
        invalidateCache('about:all');
        if (category) invalidateCache(`about:${category}`);

        res.json({
            success: true,
            message: 'About item updated successfully',
            data: result.rows[0]
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
        await query('DELETE FROM about_items WHERE id = $1', [id]);

        invalidateCache('admin:about:all');
        invalidateCache('about:all');

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
