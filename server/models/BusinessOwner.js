const mongoose = require('mongoose');

const businessOwnerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businesses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }],
  places: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place'
  }],
  verified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  documents: [{
    type: {
      type: String,
      enum: ['business_permit', 'tax_id', 'government_id', 'other'],
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
  businessInfo: {
    businessName: String,
    businessType: String,
    address: String,
    phone: String,
    email: String,
    website: String,
    description: String
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    accountType: String
  },
  statistics: {
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  rejectionReason: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
businessOwnerSchema.index({ user: 1 });
businessOwnerSchema.index({ verificationStatus: 1 });
businessOwnerSchema.index({ status: 1 });

module.exports = mongoose.model('BusinessOwner', businessOwnerSchema);

