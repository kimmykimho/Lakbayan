import mongoose from 'mongoose';

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
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Review must be at least 10 characters']
    },
    images: [{
        url: String,
        caption: String
    }],
    visitDate: {
        type: Date,
        required: true
    },
    helpful: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isVerified: {
        type: Boolean,
        default: false
    },
    response: {
        text: String,
        by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        date: Date
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews from same user for same place
reviewSchema.index({ user: 1, place: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;

