import Booking from '../models/Booking.model.js';
import Place from '../models/Place.model.js';
import User from '../models/User.model.js';

export const getBookings = async (req, res) => {
    try {
        const query = req.user.role === 'user' 
            ? { user: req.user.id }
            : {};

        const bookings = await Booking.find(query)
            .populate('user', 'name email')
            .populate('place', 'name location')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createBooking = async (req, res) => {
    try {
        req.body.user = req.user.id;

        const booking = await Booking.create(req.body);

        // Update user stats
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { 'stats.bookingsCount': 1 }
        });

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateBooking = async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check ownership or admin
        if (booking.user.toString() !== req.user.id && req.user.role === 'user') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this booking'
            });
        }

        booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check ownership or admin
        if (booking.user.toString() !== req.user.id && req.user.role === 'user') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this booking'
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

