const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  vehicle: {
    type: {
      type: String,
      enum: ['car', 'van', 'motorcycle', 'tricycle', 'jeepney', 'bus'],
      required: true
    },
    make: String,
    model: String,
    year: Number,
    color: String,
    plateNumber: {
      type: String,
      required: true,
      unique: true
    },
    capacity: {
      type: Number,
      required: true
    },
    images: [String]
  },
  license: {
    number: {
      type: String,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['professional', 'non-professional'],
      required: true
    },
    imageUrl: String
  },
  documents: [{
    type: {
      type: String,
      enum: ['license', 'vehicle_registration', 'insurance', 'police_clearance', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String
    }]
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    lastUpdated: Date
  },
  serviceAreas: [{
    name: String,
    radius: Number // in kilometers
  }],
  pricing: {
    baseRate: {
      type: Number,
      default: 0
    },
    perKilometer: {
      type: Number,
      default: 0
    },
    perMinute: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    totalTrips: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    completedTrips: {
      type: Number,
      default: 0
    },
    cancelledTrips: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'offline'],
    default: 'offline'
  },
  rejectionReason: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
driverSchema.index({ location: '2dsphere' });
driverSchema.index({ user: 1 });
driverSchema.index({ verificationStatus: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ 'availability.isAvailable': 1 });

module.exports = mongoose.model('Driver', driverSchema);

