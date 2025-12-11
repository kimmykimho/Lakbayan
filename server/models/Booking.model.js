import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    place: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
        required: true
    },
    bookingDate: {
        type: Date,
        required: [true, 'Booking date is required']
    },
    visitTime: {
        type: String,
        required: [true, 'Visit time is required']
    },
    numberOfVisitors: {
        adults: {
            type: Number,
            required: true,
            min: [0, 'Number of adults cannot be negative']
        },
        children: {
            type: Number,
            default: 0,
            min: [0, 'Number of children cannot be negative']
        },
        seniors: {
            type: Number,
            default: 0,
            min: [0, 'Number of seniors cannot be negative']
        }
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true
    },
    transportNeeded: {
        type: Boolean,
        default: false
    },
    transport: {
        needed: {
            type: Boolean,
            default: false
        },
        vehicleType: {
            type: String,
            enum: ['tricycle', 'motorcycle', 'van', 'private_car', 'own_vehicle', 'none'],
            default: 'none'
        },
        pickup: String,
        dropoff: String,
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver'
        },
        driverStatus: {
            type: String,
            enum: ['pending', 'accepted', 'arrived', 'in_transit', 'completed', 'cancelled'],
            default: 'pending'
        },
        fare: Number,
        distance: Number,
        duration: Number
    },
    transportDetails: {
        type: {
            type: String,
            enum: ['tricycle', 'multicab', 'van', 'habal']
        },
        pickup: String,
        status: String
    },
    confirmationCode: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
});

// Generate confirmation code
bookingSchema.pre('save', function(next) {
    if (!this.confirmationCode) {
        this.confirmationCode = 'BV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

