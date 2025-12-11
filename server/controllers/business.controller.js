import Business from '../models/Business.model.js';

export const getBusinesses = async (req, res) => {
    try {
        const businesses = await Business.find({ isActive: true })
            .populate('owner', 'name email')
            .sort('-createdAt');

        res.status(200).json({
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
};

export const createBusiness = async (req, res) => {
    try {
        const business = await Business.create(req.body);

        res.status(201).json({
            success: true,
            data: business
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateBusiness = async (req, res) => {
    try {
        const business = await Business.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            });
        }

        res.status(200).json({
            success: true,
            data: business
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteBusiness = async (req, res) => {
    try {
        const business = await Business.findByIdAndDelete(req.params.id);

        if (!business) {
            return res.status(404).json({
                success: false,
                message: 'Business not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Business deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

