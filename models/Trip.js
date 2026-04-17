const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
    {
        title: String,
        description: String,
        region: String,
        category: String,
        price: Number,
        duration: String, // e.g. "3 days", "5 days"
        image: String,
        featured: { type: Boolean, default: false },
        location: {
            address: String,
            city: String,
            lat: Number,
            lng: Number,
        },
        included: { type: [String], default: [] },
        excluded: { type: [String], default: [] },
        maxParticipants: Number,
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
