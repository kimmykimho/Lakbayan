const mongoose = require('mongoose');

const transportRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  vehicleType: {
    type: String,
    enum: ['tricycle', 'motorcycle', 'van', 'private_car'],
    required: true
  },
  pickup: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  destination: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    placeName: String
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'driver_enroute', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  fare: {
    estimated: Number,
    final: Number,
    currency: {
      type: String,
      default: 'PHP'
    }
  },
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  duration: {
    estimated: Number, // in minutes
    actual: Number
  },
  passengers: {
    type: Number,
    default: 1
  },
  notes: String,
  driverLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    lastUpdated: Date
  },
  eta: {
    minutes: Number,
    lastCalculated: Date
  },
  photos: [{
    url: String,
    type: {
      type: String,
      enum: ['pickup', 'destination', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      enum: ['driver', 'user']
    }
  }],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  timeline: {
    requested: {
      type: Date,
      default: Date.now
    },
    accepted: Date,
    driverEnroute: Date,
    arrivedAtPickup: Date,
    pickupCompleted: Date,
    started: Date,
    arrivedAtDestination: Date,
    completed: Date,
    cancelled: Date
  },
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['user', 'driver', 'system']
  }
}, {
  timestamps: true
});

// Indexes
transportRequestSchema.index({ user: 1, status: 1 });
transportRequestSchema.index({ driver: 1, status: 1 });
transportRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('TransportRequest', transportRequestSchema);

