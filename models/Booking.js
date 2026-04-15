const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        date: Date,
        time: String,

        participants: Number,
        totalPrice: Number,

        status: { type: String, default: 'pending' }, // pending | confirmed | cancelled
        paymentStatus: { type: String, default: 'pending' }, // pending | paid | refunded
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

