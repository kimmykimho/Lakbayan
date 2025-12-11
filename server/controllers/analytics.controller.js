import User from '../models/User.model.js';
import Place from '../models/Place.model.js';
import Booking from '../models/Booking.model.js';
import Review from '../models/Review.model.js';
import Business from '../models/Business.model.js';

export const getAnalytics = async (req, res) => {
    try {
        // Get total counts
        const totalUsers = await User.countDocuments({ isActive: true });
        const totalPlaces = await Place.countDocuments({ isActive: true });
        const totalBookings = await Booking.countDocuments();
        const totalReviews = await Review.countDocuments();

        // Get average ratings
        const places = await Place.find({ isActive: true });
        const avgRating = places.reduce((acc, place) => acc + place.stats.averageRating, 0) / places.length;

        // Get total visitors
        const totalVisitors = places.reduce((acc, place) => acc + place.stats.totalVisits, 0);

        // Get recent bookings
        const recentBookings = await Booking.find()
            .populate('user', 'name')
            .populate('place', 'name')
            .sort('-createdAt')
            .limit(5);

        // Get recent reviews
        const recentReviews = await Review.find()
            .populate('user', 'name')
            .populate('place', 'name')
            .sort('-createdAt')
            .limit(5);

        // Get business stats
        const totalBusinesses = await Business.countDocuments({ isActive: true });
        const totalRevenue = await Business.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$revenue' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalPlaces,
                    totalBookings,
                    totalReviews,
                    totalVisitors,
                    avgRating: avgRating.toFixed(1),
                    totalBusinesses,
                    totalRevenue: totalRevenue[0]?.total || 0
                },
                recentBookings,
                recentReviews
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

