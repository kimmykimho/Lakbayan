const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['restaurant', 'hotel', 'transport', 'tour', 'retail', 'other']
  },
  description: String,
  logo: String,
  images: [String],
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  pricing: {
    entranceFee: Number,
    adult: Number,
    child: Number,
    senior: Number,
    pricePerNight: Number, // For hotels
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
    category: String, // appetizer, main course, dessert, drinks
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
    categories: [String], // electronics, clothing, groceries, etc.
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
      schedule: [{
        date: Date,
        time: String,
        price: Number
      }]
    }],
    ticketPrice: Number,
    facilities: [String]
  },
  // For Services
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: String, // e.g., "1 hour", "30 minutes"
    category: String
  }],
  revenue: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  permits: [{
    type: String,
    number: String,
    issuedDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['valid', 'expired', 'pending'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Business', businessSchema);

