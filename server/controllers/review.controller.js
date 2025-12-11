import Review from '../models/Review.model.js';
import Place from '../models/Place.model.js';
import User from '../models/User.model.js';

export const getReviews = async (req, res) => {
    try {
        const { place, user } = req.query;
        let query = {};

        if (place) query.place = place;
        if (user) query.user = user;

        const reviews = await Review.find(query)
            .populate('user', 'name avatar')
            .populate('place', 'name')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createReview = async (req, res) => {
    try {
        req.body.user = req.user.id;

        const review = await Review.create(req.body);

        // Update place rating
        const reviews = await Review.find({ place: req.body.place });
        const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

        await Place.findByIdAndUpdate(req.body.place, {
            'stats.averageRating': avgRating,
            'stats.reviewsCount': reviews.length
        });

        // Update user stats
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { 'stats.reviewsCount': 1 }
        });

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
};

export const updateReview = async (req, res) => {
    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (review.user.toString() !== req.user.id && req.user.role === 'user') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review'
            });
        }

        review = await Review.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (review.user.toString() !== req.user.id && req.user.role === 'user') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        await review.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

