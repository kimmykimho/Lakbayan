import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Place name is required'],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['nature', 'cultural', 'beach', 'food', 'adventure', 'historical', 'shopping', 'accommodation'],
        lowercase: true
    },
    images: {
        type: [String],
        default: []
    },
    location: {
        address: String,
        coordinates: {
            lat: {
                type: Number,
                required: true
            },
            lng: {
                type: Number,
                required: true
            }
        },
        municipality: {
            type: String,
            default: 'Buenavista'
        },
        province: {
            type: String,
            default: 'Agusan del Sur'
        }
    },
    highlights: [{
        type: String,
        trim: true
    }],
    activities: [{
        type: String,
        trim: true
    }],
    facilities: [{
        type: String,
        trim: true
    }],
    bestTimeToVisit: {
        type: String,
        trim: true
    },
    entranceFee: {
        adult: {
            type: Number,
            default: 0
        },
        child: {
            type: Number,
            default: 0
        },
        senior: {
            type: Number,
            default: 0
        }
    },
    contactInfo: {
        phone: String,
        email: String,
        website: String
    },
    openingHours: {
        monday: { open: String, close: String, isClosed: Boolean },
        tuesday: { open: String, close: String, isClosed: Boolean },
        wednesday: { open: String, close: String, isClosed: Boolean },
        thursday: { open: String, close: String, isClosed: Boolean },
        friday: { open: String, close: String, isClosed: Boolean },
        saturday: { open: String, close: String, isClosed: Boolean },
        sunday: { open: String, close: String, isClosed: Boolean }
    },
    stats: {
        totalVisits: {
            type: Number,
            default: 0
        },
        currentVisitors: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        reviewsCount: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    lastMaintenance: {
        type: Date
    },
    nextMaintenance: {
        type: Date
    }
}, {
    timestamps: true
});

// Create slug from name
placeSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    }
    next();
});

// Index for geospatial queries
placeSchema.index({ 'location.coordinates': '2dsphere' });

const Place = mongoose.model('Place', placeSchema);

export default Place;

