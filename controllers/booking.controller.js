const Booking = require('../models/Booking');
const Activity = require('../models/Activity');
const Availability = require('../models/Availability');

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

// ─── Client: create a booking ─────────────────────────────────────────────────

exports.create = async (req, res) => {
    try {
        const { activityId, date, startTime, participants } = req.body;

        // ── 1. Input validation ───────────────────────────────────────────────
        if (!activityId || !date || !startTime || !participants) {
            return res.status(400).json({
                success: false,
                message: 'activityId, date, startTime, and participants are required.',
            });
        }
        if (!/^\d{2}:\d{2}$/.test(startTime)) {
            return res.status(400).json({ success: false, message: 'startTime must be in HH:mm format.' });
        }
        const numParticipants = Number(participants);
        if (!Number.isInteger(numParticipants) || numParticipants < 1) {
            return res.status(400).json({ success: false, message: 'participants must be a positive integer.' });
        }

        // Date must not be in the past
        const normalizedDate = toDateOnly(date);
        const today = toDateOnly(new Date());
        if (normalizedDate < today) {
            return res.status(400).json({ success: false, message: 'Cannot book a date in the past.' });
        }

        // ── 2. Fetch activity (need duration + providerId + price) ─────────────
        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

        if (!activity.duration || activity.duration <= 0) {
            return res.status(422).json({ success: false, message: 'This activity has no valid duration set.' });
        }
        if (activity.maxParticipants && numParticipants > activity.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${activity.maxParticipants} participants allowed per booking.`,
            });
        }

        const providerId = activity.providerId;

        // ── 3. Calculate endTime from activity duration ───────────────────────
        const durationMins = Math.round(Number(activity.duration) * 60); // hours → minutes
        const startMins = toMinutes(startTime);
        const endMins = startMins + durationMins;
        if (endMins > 24 * 60) {
            return res.status(400).json({ success: false, message: 'This booking would extend past midnight.' });
        }
        const endTime = fromMinutes(endMins);

        // ── 4. Verify a matching availability slot exists ─────────────────────
        const availability = await Availability.findOne({ activityId, providerId, date: normalizedDate });
        if (!availability || availability.timeSlots.length === 0) {
            return res.status(409).json({ success: false, message: 'No availability defined for this activity on the selected date.' });
        }
        if (availability.isBlocked) {
            return res.status(409).json({ success: false, message: 'The provider has blocked this date. Please choose another date.' });
        }

        const slot = availability.timeSlots.find((s) => s.startTime === startTime);
        if (!slot) {
            return res.status(409).json({
                success: false,
                message: `The time slot ${startTime} is not available on this date. Please choose from the listed slots.`,
            });
        }

        // ── 5. Count active bookings for this exact slot ──────────────────────
        // Guard against race conditions by doing an atomic spot-capacity check.
        // We count total participants already booked in this slot and reject if
        // adding numParticipants would exceed availableSpots.
        const slotBookings = await Booking.find({
            activityId,
            providerId,
            date: normalizedDate,
            startTime,
            status: { $in: ['pending', 'confirmed'] },
        }).lean();

        const bookedParticipants = slotBookings.reduce((sum, b) => sum + (b.participants || 1), 0);
        if (bookedParticipants + numParticipants > slot.availableSpots) {
            const remaining = Math.max(0, slot.availableSpots - bookedParticipants);
            return res.status(409).json({
                success: false,
                message: remaining === 0
                    ? `This time slot is fully booked.`
                    : `Only ${remaining} spot(s) remaining in this slot.`,
            });
        }

        // ── 6. Overlap check: no other booking by same provider overlaps ──────
        // This prevents a provider from being double-booked in overlapping windows.
        const providerBookingsOnDate = await Booking.find({
            providerId,
            date: normalizedDate,
            status: { $in: ['pending', 'confirmed'] },
        }).lean();

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);

        for (const b of providerBookingsOnDate) {
            // Same slot is already accounted for by spot capacity; skip same-slot entries
            if (b.startTime === startTime && String(b.activityId) === String(activityId)) continue;

            const bStart = toMinutes(b.startTime);
            const bEnd = toMinutes(b.endTime);
            if (rangesOverlap(newStart, newEnd, bStart, bEnd)) {
                return res.status(409).json({
                    success: false,
                    message: `The selected time window (${startTime}–${endTime}) overlaps with another booking for this provider.`,
                });
            }
        }

        // ── 7. Create booking ─────────────────────────────────────────────────
        const totalPrice = (activity.price || 0) * numParticipants;
        const userId = req.user.id;

        const booking = await Booking.create({
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
        });

        return res.status(201).json({ success: true, message: 'Booking created.', data: booking });
    } catch (err) {
        console.error('[booking.create]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ─── Client: my bookings (with activity info) ─────────────────────────────────

exports.listMine = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .sort({ date: -1, startTime: 1 })
            .populate('activityId', 'title images price duration city category')
            .lean();

        // Normalise populated field to "activity" key for the frontend
        const data = bookings.map(({ activityId, ...rest }) => ({
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
            .populate('activityId', 'title images price duration city category')
            .populate('userId', 'username email')
            .lean();

        const data = bookings.map(({ activityId, userId, ...rest }) => ({
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

