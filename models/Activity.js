const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
    {
        title: String,
        description: String,
        city: String,
        category: String,
        price: Number,
        duration: Number, // in hours
        images: { type: [String], default: [] },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        location: {
            address: String,
            lat: Number,
            lng: Number,
        },
        included: { type: [String], default: [] },
        excluded: { type: [String], default: [] },
        capacity: { type: Number, min: 1 },
        maxParticipants: Number,
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;

