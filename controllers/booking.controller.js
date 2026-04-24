const Booking = require('../models/Booking');
const Activity = require('../models/Activity');
const Availability = require('../models/Availability');
const mongoose = require('mongoose');

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "HH:mm" → minutes since midnight */
const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** minutes → "HH:mm" */
const fromMinutes = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Normalise to midnight UTC */
const toDateOnly = (value) => {
    const d = new Date(value);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

/** True if [s1,e1) and [s2,e2) overlap (in minutes) */
const rangesOverlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

const dateKey = (date) => new Date(date).toISOString().split('T')[0];
const slotKey = (activityId, date, startTime) => `${String(activityId)}|${dateKey(date)}|${startTime}`;
const httpError = (status, message) => {
    const err = new Error(message);
    err.status = status;
    return err;
};

const enrichBookingsWithSlotMetrics = async (bookings) => {
    if (!Array.isArray(bookings) || bookings.length === 0) return bookings;

    const slotRows = bookings.filter((b) => b?.activityId && b?.date && b?.startTime);
    if (slotRows.length === 0) return bookings;

    const activityIds = [...new Set(slotRows.map((b) => String(b.activityId?._id || b.activityId)))];
    const startTimes = [...new Set(slotRows.map((b) => b.startTime))];
    const dates = slotRows.map((b) => new Date(b.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const activityObjectIds = activityIds.map((id) => new mongoose.Types.ObjectId(id));

    const [bookedAgg, availabilityDocs] = await Promise.all([
        Booking.aggregate([
            {
                $match: {
                    activityId: { $in: activityObjectIds },
                    date: { $gte: minDate, $lte: maxDate },
                    startTime: { $in: startTimes },
                    status: { $in: ACTIVE_BOOKING_STATUSES },
                },
            },
            {
                $group: {
                    _id: { activityId: '$activityId', date: '$date', startTime: '$startTime' },
                    bookedSpots: { $sum: '$participants' },
                },
            },
        ]),
        Availability.find({
            activityId: { $in: activityObjectIds },
            date: { $gte: minDate, $lte: maxDate },
        }).lean(),
    ]);

    const bookedMap = new Map(
        bookedAgg.map((row) => [
            slotKey(row._id.activityId, row._id.date, row._id.startTime),
            row.bookedSpots,
        ])
    );

    const capacityMap = new Map();
    for (const availability of availabilityDocs) {
        for (const slot of availability.timeSlots || []) {
            capacityMap.set(
                slotKey(availability.activityId, availability.date, slot.startTime),
                slot.availableSpots
            );
        }
    }

    return bookings.map((booking) => {
        const key = slotKey(booking.activityId?._id || booking.activityId, booking.date, booking.startTime);
        const capacity = capacityMap.get(key);
        const bookedSpots = bookedMap.get(key) || 0;
        if (capacity == null) return booking;
        return {
            ...booking,
            capacity,
            bookedSpots,
            remainingSpots: Math.max(0, capacity - bookedSpots),
        };
    });
};

// ─── Client: create a booking ─────────────────────────────────────────────────

exports.create = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        let responseData;

        await session.withTransaction(async () => {
            const { activityId, date, startTime, participants } = req.body;

            if (!activityId || !date || !startTime || !participants) {
                throw httpError(400, 'activityId, date, startTime, and participants are required.');
            }
            if (!/^\d{2}:\d{2}$/.test(startTime)) {
                throw httpError(400, 'startTime must be in HH:mm format.');
            }

            const numParticipants = Number(participants);
            if (!Number.isInteger(numParticipants) || numParticipants < 1) {
                throw httpError(400, 'participants must be a positive integer.');
            }

            const normalizedDate = toDateOnly(date);
            const today = toDateOnly(new Date());
            if (normalizedDate < today) {
                throw httpError(400, 'Cannot book a date in the past.');
            }

            const activity = await Activity.findById(activityId).session(session);
            if (!activity) throw httpError(404, 'Activity not found.');

            if (!activity.duration || activity.duration <= 0) {
                throw httpError(422, 'This activity has no valid duration set.');
            }

            const activityCapacity = activity.capacity ?? activity.maxParticipants;
            if (activityCapacity && numParticipants > activityCapacity) {
                throw httpError(400, `Maximum ${activityCapacity} participant(s) allowed for this activity.`);
            }

            const providerId = activity.providerId;
            const durationMins = Math.round(Number(activity.duration) * 60);
            const startMins = toMinutes(startTime);
            const endMins = startMins + durationMins;
            if (endMins > 24 * 60) {
                throw httpError(400, 'This booking would extend past midnight.');
            }
            const endTime = fromMinutes(endMins);

            const availability = await Availability.findOne({ activityId, providerId, date: normalizedDate }).session(session);
            if (!availability || availability.timeSlots.length === 0) {
                throw httpError(409, 'No availability defined for this activity on the selected date.');
            }
            if (availability.isBlocked) {
                throw httpError(409, 'The provider has blocked this date. Please choose another date.');
            }

            const slot = availability.timeSlots.find((s) => s.startTime === startTime);
            if (!slot) {
                throw httpError(409, `The time slot ${startTime} is not available on this date. Please choose from the listed slots.`);
            }

            const slotBookings = await Booking.find({
                activityId,
                providerId,
                date: normalizedDate,
                startTime,
                status: { $in: ACTIVE_BOOKING_STATUSES },
            }).session(session).lean();

            const bookedParticipants = slotBookings.reduce((sum, b) => sum + (b.participants || 1), 0);
            const slotCapacity = slot.availableSpots;
            if (bookedParticipants + numParticipants > slotCapacity) {
                const remaining = Math.max(0, slotCapacity - bookedParticipants);
                throw httpError(
                    409,
                    remaining === 0
                        ? 'This time slot is fully booked.'
                        : `Only ${remaining} spot(s) remaining in this slot.`
                );
            }

            const providerBookingsOnDate = await Booking.find({
                providerId,
                date: normalizedDate,
                status: { $in: ACTIVE_BOOKING_STATUSES },
            }).session(session).lean();

            const newStart = toMinutes(startTime);
            const newEnd = toMinutes(endTime);

            for (const b of providerBookingsOnDate) {
                if (b.startTime === startTime && String(b.activityId) === String(activityId)) continue;
                const bStart = toMinutes(b.startTime);
                const bEnd = toMinutes(b.endTime);
                if (rangesOverlap(newStart, newEnd, bStart, bEnd)) {
                    throw httpError(409, `The selected time window (${startTime}–${endTime}) overlaps with another booking for this provider.`);
                }
            }

            const totalPrice = (activity.price || 0) * numParticipants;
            const userId = req.user.id;

            const [booking] = await Booking.create([
                {
                    userId,
                    activityId,
                    providerId,
                    date: normalizedDate,
                    startTime,
                    endTime,
                    participants: numParticipants,
                    totalPrice,
                    status: 'pending',
                    paymentStatus: 'pending',
                },
            ], { session });

            const nextBooked = bookedParticipants + numParticipants;
            responseData = {
                ...booking.toObject(),
                capacity: slotCapacity,
                bookedSpots: nextBooked,
                remainingSpots: Math.max(0, slotCapacity - nextBooked),
            };
        });

        return res.status(201).json({ success: true, message: 'Booking created.', data: responseData });
    } catch (err) {
        console.error('[booking.create]', err.message);
        if (err.status) return res.status(err.status).json({ success: false, message: err.message });
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        session.endSession();
    }
};

// ─── Client: my bookings (with activity info) ─────────────────────────────────

exports.listMine = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .sort({ date: -1, startTime: 1 })
            .populate('activityId', 'title images price duration city category capacity maxParticipants')
            .lean();

        const enriched = await enrichBookingsWithSlotMetrics(bookings);

        // Normalise populated field to "activity" key for the frontend
        const data = enriched.map(({ activityId, ...rest }) => ({
            ...rest,
            activity: activityId,
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[booking.listMine]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ─── Provider: incoming bookings ─────────────────────────────────────────────

exports.listAsProvider = async (req, res) => {
    try {
        const bookings = await Booking.find({ providerId: req.user.id })
            .sort({ date: -1, startTime: 1 })
            .populate('activityId', 'title images price duration city category capacity maxParticipants')
            .populate('userId', 'username email')
            .lean();

        const enriched = await enrichBookingsWithSlotMetrics(bookings);

        const data = enriched.map(({ activityId, userId, ...rest }) => ({
            ...rest,
            activity: activityId,
            user: userId,
        }));

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[booking.listAsProvider]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ─── Owner / provider / admin: update status ─────────────────────────────────

exports.updateStatus = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        const isOwner = String(booking.userId) === String(req.user.id);
        const isProvider = String(booking.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';

        if (!isOwner && !isProvider && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const { status, paymentStatus } = req.body;

        // Clients may only cancel their own bookings
        if (isOwner && !isProvider && !isAdmin) {
            if (status && status !== 'cancelled') {
                return res.status(403).json({ success: false, message: 'Clients can only cancel bookings.' });
            }
        }

        if (status) booking.status = status;
        if (paymentStatus) booking.paymentStatus = paymentStatus;

        await booking.save();
        return res.status(200).json({ success: true, message: 'Booking updated.', data: booking });
    } catch (err) {
        console.error('[booking.updateStatus]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

