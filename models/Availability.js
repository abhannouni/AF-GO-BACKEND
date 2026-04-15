const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
    {
        startTime: String,
        endTime: String,
        availableSpots: Number,
    },
    { _id: false }
);

const availabilitySchema = new mongoose.Schema(
    {
        activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
        date: Date,
        timeSlots: { type: [timeSlotSchema], default: [] },
    },
    { timestamps: true }
);

const Availability = mongoose.model('Availability', availabilitySchema);

module.exports = Availability;

