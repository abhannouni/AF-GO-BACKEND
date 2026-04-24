const mongoose = require('mongoose');

// A single bookable slot defined by a provider for one date.
// endTime is omitted here because it is derived from the activity's duration at booking time.
const timeSlotSchema = new mongoose.Schema(
    {
        startTime: { type: String, required: true }, // "HH:mm"  e.g. "09:00"
        availableSpots: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const availabilitySchema = new mongoose.Schema(
    {
        activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        date: { type: Date, required: true },
        timeSlots: { type: [timeSlotSchema], default: [] },
        /** When true the provider has explicitly blocked this date — no bookings allowed */
        isBlocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index for the most common query: available slots for activity on a date
availabilitySchema.index({ activityId: 1, date: 1 });
// Unique: one availability document per activity per provider per date
availabilitySchema.index({ activityId: 1, providerId: 1, date: 1 }, { unique: true });

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;

