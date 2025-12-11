import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Business name is required'],
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        required: true,
        enum: ['restaurant', 'hotel', 'tour_operator', 'transport', 'souvenir_shop', 'other']
    },
    description: {
        type: String,
        trim: true
    },
    location: {
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    contactInfo: {
        phone: {
            type: String,
            required: true
        },
        email: String,
        website: String
    },
    revenue: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    permits: [{
        type: {
            type: String,
            enum: ['business_permit', 'health_permit', 'fire_safety', 'environmental_clearance', 'tourism_accreditation']
        },
        number: String,
        issueDate: Date,
        expiryDate: Date,
        status: {
            type: String,
            enum: ['valid', 'expired', 'pending_renewal'],
            default: 'valid'
        }
    }],
    operatingHours: {
        monday: { open: String, close: String, isClosed: Boolean },
        tuesday: { open: String, close: String, isClosed: Boolean },
        wednesday: { open: String, close: String, isClosed: Boolean },
        thursday: { open: String, close: String, isClosed: Boolean },
        friday: { open: String, close: String, isClosed: Boolean },
        saturday: { open: String, close: String, isClosed: Boolean },
        sunday: { open: String, close: String, isClosed: Boolean }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Business = mongoose.model('Business', businessSchema);

export default Business;

