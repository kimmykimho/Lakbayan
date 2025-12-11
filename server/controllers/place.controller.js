import Place from '../models/Place.model.js';

// @desc    Get all places
// @route   GET /api/places
// @access  Public
export const getPlaces = async (req, res) => {
    try {
        const { category, featured, active, search, sort = '-createdAt' } = req.query;

        let query = {};

        if (category) query.category = category;
        if (featured) query.isFeatured = featured === 'true';
        if (active !== undefined) query.isActive = active === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const places = await Place.find(query).sort(sort);

        res.status(200).json({
            success: true,
            count: places.length,
            data: places
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single place
// @route   GET /api/places/:id
// @access  Public
export const getPlace = async (req, res) => {
    try {
        const place = await Place.findById(req.params.id);

        if (!place) {
            return res.status(404).json({
                success: false,
                message: 'Place not found'
            });
        }

        res.status(200).json({
            success: true,
            data: place
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create place
// @route   POST /api/places
// @access  Private (Admin, Tourism Officer)
export const createPlace = async (req, res) => {
    try {
        const place = await Place.create(req.body);

        res.status(201).json({
            success: true,
            data: place
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update place
// @route   PUT /api/places/:id
// @access  Private (Admin, Tourism Officer)
export const updatePlace = async (req, res) => {
    try {
        const place = await Place.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!place) {
            return res.status(404).json({
                success: false,
                message: 'Place not found'
            });
        }

        res.status(200).json({
            success: true,
            data: place
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete place
// @route   DELETE /api/places/:id
// @access  Private (Admin, Tourism Officer)
export const deletePlace = async (req, res) => {
    try {
        const place = await Place.findByIdAndDelete(req.params.id);

        if (!place) {
            return res.status(404).json({
                success: false,
                message: 'Place not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Place deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update place stats (visitors)
// @route   PATCH /api/places/:id/stats
// @access  Public
export const updatePlaceStats = async (req, res) => {
    try {
        const { currentVisitors, totalVisits } = req.body;

        const place = await Place.findById(req.params.id);

        if (!place) {
            return res.status(404).json({
                success: false,
                message: 'Place not found'
            });
        }

        if (currentVisitors !== undefined) {
            place.stats.currentVisitors = currentVisitors;
        }
        if (totalVisits !== undefined) {
            place.stats.totalVisits += totalVisits;
        }

        await place.save();

        res.status(200).json({
            success: true,
            data: place
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

