const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

        date: { type: Date, required: true },
        startTime: { type: String, required: true }, // "HH:mm"
        endTime: { type: String, required: true }, // "HH:mm"  — auto-computed from activity.duration

        participants: { type: Number, required: true, min: 1 },
        totalPrice: { type: Number, required: true },

        status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled', 'rejected'] },
        paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'refunded'] },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Fast look-up for conflict detection: same provider, same date
bookingSchema.index({ providerId: 1, date: 1 });
bookingSchema.index({ userId: 1 });
// Fast look-up for calendar endpoint: bookings per activity per month
bookingSchema.index({ activityId: 1, date: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

