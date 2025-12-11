const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: 10
  },
  images: [String],
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  response: {
    text: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure one review per user per place
reviewSchema.index({ user: 1, place: 1 }, { unique: true });

// Update place rating after review save
reviewSchema.post('save', async function() {
  const Place = mongoose.model('Place');
  const place = await Place.findById(this.place);
  if (place) {
    await place.updateRating();
  }
});

// Update place rating after review deletion
reviewSchema.post('remove', async function() {
  const Place = mongoose.model('Place');
  const place = await Place.findById(this.place);
  if (place) {
    await place.updateRating();
  }
});

module.exports = mongoose.model('Review', reviewSchema);

