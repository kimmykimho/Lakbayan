const mongoose = require('mongoose');

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
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: true,
    enum: ['nature', 'cultural', 'beach', 'food', 'adventure', 'historical', 'shopping', 'accommodation']
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
  contact: {
    phone: String,
    email: String,
    website: String
  },
  hours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  pricing: {
    entranceFee: Number,
    adult: Number,
    child: Number,
    senior: Number,
    pricePerNight: Number, // For hotels/accommodation
    currency: {
      type: String,
      default: 'PHP'
    },
    isFree: {
      type: Boolean,
      default: false
    }
  },
  // For Restaurants/Food
  menu: [{
    name: String,
    description: String,
    recipe: String,
    price: Number,
    category: String,
    image: String,
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  // For Hotels/Accommodation
  accommodation: {
    pricePerNight: Number,
    roomTypes: [{
      type: String,
      name: String,
      capacity: Number,
      price: Number,
      amenities: [String]
    }],
    checkInTime: String,
    checkOutTime: String
  },
  // For Shops/Retail
  shop: {
    categories: [String],
    details: String,
    products: [{
      name: String,
      description: String,
      category: String,
      price: Number,
      image: String
    }],
    paymentMethods: [String]
  },
  // For Entertainment (Cinema, etc.)
  entertainment: {
    nowShowing: [{
      title: String,
      description: String,
      genre: String,
      duration: String,
      poster: String,
      date: String,
      time: String,
      price: Number
    }],
    ticketPrice: Number,
    facilities: [String]
  },
  // For Services
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: String,
    category: String
  }],
  amenities: [String],
  activities: [String],
  highlights: [String],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  visitors: {
    current: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    capacity: Number,
    peakHours: {
      weekday: String,
      weekend: String
    }
  },
  bestTimeToVisit: {
    season: String,
    hours: String,
    description: String
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    parkingAvailable: Boolean,
    publicTransport: Boolean
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  virtualTour: {
    available: Boolean,
    url: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate slug from name
placeSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Update visitor count in real-time
placeSchema.methods.updateVisitorCount = function(increment = true) {
  if (increment) {
    this.visitors.current += 1;
    this.visitors.total += 1;
  } else {
    this.visitors.current = Math.max(0, this.visitors.current - 1);
  }
  return this.save();
};

// Calculate average rating
placeSchema.methods.updateRating = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { place: this._id } },
    { $group: {
      _id: null,
      avgRating: { $avg: '$rating' },
      count: { $sum: 1 }
    }}
  ]);
  
  if (stats.length > 0) {
    this.rating.average = Math.round(stats[0].avgRating * 10) / 10;
    this.rating.count = stats[0].count;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }
  
  return this.save();
};

// Indexes for better query performance
placeSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
placeSchema.index({ category: 1 });
placeSchema.index({ status: 1 });
placeSchema.index({ featured: 1 });
placeSchema.index({ 'rating.average': -1 });

module.exports = mongoose.model('Place', placeSchema);

