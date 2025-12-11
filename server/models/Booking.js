const mongoose = require('mongoose');

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
  bookingType: {
    type: String,
    enum: ['visit', 'transport', 'event'],
    default: 'visit'
  },
  visitDate: {
    type: Date,
    required: true
  },
  visitTime: {
    type: String,
    required: true
  },
  numberOfVisitors: {
    type: Number,
    required: true,
    min: 1
  },
  contactInfo: {
    name: String,
    phone: String,
    email: String
  },
  specialRequests: String,
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
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  payment: {
    amount: Number,
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    method: String,
    transactionId: String,
    paidAt: Date
  },
  qrCode: String,
  confirmationCode: {
    type: String,
    unique: true
  },
  checkIn: {
    status: Boolean,
    time: Date
  },
  checkOut: {
    status: Boolean,
    time: Date
  },
  notes: String,
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Generate confirmation code
bookingSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'BV' + Date.now().toString(36).toUpperCase() + 
                           Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Indexes
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ place: 1, visitDate: 1 });
bookingSchema.index({ confirmationCode: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

