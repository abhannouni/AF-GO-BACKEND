const Availability = require('../models/Availability');
const Booking = require('../models/Booking');
const Activity = require('../models/Activity');

// ─── Shared error handler ─────────────────────────────────────────────────────

const handleError = (res, err, handler) => {
    console.error(`[availability.${handler}]`, err);
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid value for field '${err.path}'.` });
    }
    if (err.name === 'ValidationError') {
        const msgs = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, message: msgs.join('; ') });
    }
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'An availability record for this activity, provider, and date already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error.' });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:mm" into total minutes from midnight */
const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** Convert total minutes to "HH:mm" */
const fromMinutes = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Normalise a calendar date to midnight UTC so queries are date-only.
 * Accepts ISO strings, JS Date objects, or "YYYY-MM-DD" strings.
 */
const toDateOnly = (value) => {
    const d = new Date(value);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

// ─── Provider: create / upsert availability for a date ────────────────────────

exports.create = async (req, res) => {
    try {
        const { activityId, date, timeSlots, isBlocked } = req.body;
        const blocked = !!isBlocked;

        if (!activityId || !date) {
            return res.status(400).json({ success: false, message: 'activityId and date are required.' });
        }
        if (!blocked && (!Array.isArray(timeSlots) || timeSlots.length === 0)) {
            return res.status(400).json({ success: false, message: 'Provide at least one timeSlot, or set isBlocked=true.' });
        }

        // Verify the activity belongs to this provider
        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });
        if (String(activity.providerId) !== String(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You can only manage availability for your own activities.' });
        }

        // Validate slot format (only when not blocking)
        if (!blocked && Array.isArray(timeSlots)) {
            for (const slot of timeSlots) {
                if (!slot.startTime || !/^\d{2}:\d{2}$/.test(slot.startTime)) {
                    return res.status(400).json({ success: false, message: `Invalid startTime format: "${slot.startTime}". Use HH:mm.` });
                }
                if (!slot.availableSpots || slot.availableSpots < 1) {
                    return res.status(400).json({ success: false, message: 'Each slot must have at least 1 available spot.' });
                }
            }
        }

        const normalizedDate = toDateOnly(date);
        const providerId = req.user.id;

        // Upsert: one document per (activityId, providerId, date)
        const availability = await Availability.findOneAndUpdate(
            { activityId, providerId, date: normalizedDate },
            { $set: { timeSlots: blocked ? [] : (timeSlots || []), isBlocked: blocked } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json({ success: true, message: blocked ? 'Date blocked.' : 'Availability saved.', data: availability });
    } catch (err) {
        return handleError(res, err, 'create');
    }
};

// ─── Public: list availability records ────────────────────────────────────────

exports.list = async (req, res) => {
    try {
        const { activityId, providerId, date } = req.query;
        const filter = {};
        if (activityId) filter.activityId = activityId;
        if (providerId) filter.providerId = providerId;
        if (date) filter.date = toDateOnly(date);

        const items = await Availability.find(filter).sort({ date: 1 });
        return res.status(200).json({ success: true, data: items });
    } catch (err) {
        return handleError(res, err, 'list');
    }
};

// ─── Public: get available slots with remaining capacity ──────────────────────
// GET /availability/slots?activityId=&date=
// Returns slots annotated with remainingSpots = availableSpots - confirmedBookings

exports.getSlots = async (req, res) => {
    try {
        const { activityId, date } = req.query;
        if (!activityId || !date) {
            return res.status(400).json({ success: false, message: 'activityId and date are required.' });
        }

        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

        const normalizedDate = toDateOnly(date);

        const availability = await Availability.findOne({ activityId, date: normalizedDate });
        if (!availability) {
            return res.status(200).json({ success: true, data: { slots: [], date: normalizedDate, isBlocked: false } });
        }
        if (availability.isBlocked) {
            return res.status(200).json({ success: true, data: { slots: [], date: normalizedDate, isBlocked: true } });
        }
        if (availability.timeSlots.length === 0) {
            return res.status(200).json({ success: true, data: { slots: [], date: normalizedDate, isBlocked: false } });
        }

        // Count active bookings per startTime for this provider on this date
        const existingBookings = await Booking.find({
            activityId,
            providerId: availability.providerId,
            date: normalizedDate,
            status: { $in: ['pending', 'confirmed'] },
        }).lean();

        const bookedMap = {};
        for (const b of existingBookings) {
            bookedMap[b.startTime] = (bookedMap[b.startTime] || 0) + (b.participants || 1);
        }

        const durationMins = Number(activity.duration) * 60; // activity.duration is in hours

        const slots = availability.timeSlots.map((slot) => {
            const bookedParticipants = bookedMap[slot.startTime] || 0;
            const remainingSpots = Math.max(0, slot.availableSpots - bookedParticipants);
            const endTime = fromMinutes(toMinutes(slot.startTime) + durationMins);
            return {
                startTime: slot.startTime,
                endTime,
                availableSpots: slot.availableSpots,
                remainingSpots,
                isAvailable: remainingSpots > 0,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                activityId,
                providerId: availability.providerId,
                date: normalizedDate,
                durationHours: activity.duration,
                isBlocked: false,
                slots,
            },
        });
    } catch (err) {
        return handleError(res, err, 'getSlots');
    }
};

// ─── Provider: update (replace time slots) ────────────────────────────────────

exports.update = async (req, res) => {
    try {
        const availability = await Availability.findById(req.params.id);
        if (!availability) return res.status(404).json({ success: false, message: 'Availability record not found.' });

        const isOwner = String(availability.providerId) === String(req.user.id);
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const { timeSlots, isBlocked } = req.body;
        if (typeof isBlocked !== 'undefined') availability.isBlocked = !!isBlocked;
        if (!availability.isBlocked) {
            if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
                return res.status(400).json({ success: false, message: 'Provide at least one timeSlot, or set isBlocked=true.' });
            }
            for (const slot of timeSlots) {
                if (!slot.startTime || !/^\d{2}:\d{2}$/.test(slot.startTime)) {
                    return res.status(400).json({ success: false, message: `Invalid startTime format: "${slot.startTime}". Use HH:mm.` });
                }
                if (!slot.availableSpots || slot.availableSpots < 1) {
                    return res.status(400).json({ success: false, message: 'Each slot must have at least 1 available spot.' });
                }
            }
            availability.timeSlots = timeSlots;
        } else {
            availability.timeSlots = [];
        }
        await availability.save();

        return res.status(200).json({ success: true, message: 'Availability updated.', data: availability });
    } catch (err) {
        return handleError(res, err, 'update');
    }
};

// ─── Provider: delete an availability record ──────────────────────────────────

exports.remove = async (req, res) => {
    try {
        const availability = await Availability.findById(req.params.id);
        if (!availability) return res.status(404).json({ success: false, message: 'Availability record not found.' });

        const isOwner = String(availability.providerId) === String(req.user.id);
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Warn if active bookings exist on this date
        const activeBookings = await Booking.countDocuments({
            activityId: availability.activityId,
            providerId: availability.providerId,
            date: availability.date,
            status: { $in: ['pending', 'confirmed'] },
        });
        if (activeBookings > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete: ${activeBookings} active booking(s) exist for this date. Cancel them first.`,
            });
        }

        await availability.deleteOne();
        return res.status(200).json({ success: true, message: 'Availability deleted.' });
    } catch (err) {
        return handleError(res, err, 'remove');
    }
};

// ─── Public: month calendar view for a given activity ────────────────────────────────────────
// GET /availability/calendar?activityId=&year=&month=
// Returns per-day status for each day of the given month.
// status: 'available' | 'full' | 'blocked' | 'none' | 'past'

exports.getCalendar = async (req, res) => {
    try {
        const { activityId, year, month } = req.query;
        if (!activityId || !year || !month) {
            return res.status(400).json({ success: false, message: 'activityId, year, and month are required.' });
        }

        const y = Number(year);
        const m = Number(month); // 1-based
        if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
            return res.status(400).json({ success: false, message: 'Invalid year or month.' });
        }

        const startDate = new Date(Date.UTC(y, m - 1, 1));
        const endDate = new Date(Date.UTC(y, m, 0));   // last day of month

        // Fetch all availability records for this activity in this month
        const records = await Availability.find({
            activityId,
            date: { $gte: startDate, $lte: endDate },
        }).lean();

        // Fetch all active bookings for this activity in this month (count participants per slot)
        const bookings = await Booking.find({
            activityId,
            date: { $gte: startDate, $lte: endDate },
            status: { $in: ['pending', 'confirmed'] },
        }).lean();

        // Build booking participant count: dateStr → { startTime → totalParticipants }
        const bookingsByDate = {};
        for (const b of bookings) {
            const ds = b.date.toISOString().split('T')[0];
            if (!bookingsByDate[ds]) bookingsByDate[ds] = {};
            bookingsByDate[ds][b.startTime] = (bookingsByDate[ds][b.startTime] || 0) + (b.participants || 1);
        }

        // Build a date-indexed record map
        const recordByDate = {};
        for (const r of records) {
            const ds = r.date.toISOString().split('T')[0];
            recordByDate[ds] = r;
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const daysInMonth = endDate.getUTCDate();

        const result = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(Date.UTC(y, m - 1, d));
            const dateStr = date.toISOString().split('T')[0];
            const record = recordByDate[dateStr];

            let status;
            let availableSlotCount = 0;

            if (date < today) {
                status = 'past';
            } else if (!record) {
                status = 'none';
            } else if (record.isBlocked) {
                status = 'blocked';
            } else {
                const dateBkgs = bookingsByDate[dateStr] || {};
                const openSlots = (record.timeSlots || []).filter((slot) => {
                    const booked = dateBkgs[slot.startTime] || 0;
                    return booked < slot.availableSpots;
                });
                availableSlotCount = openSlots.length;
                status = availableSlotCount > 0 ? 'available' : 'full';
            }

            result.push({ date: dateStr, status, availableSlotCount });
        }

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return handleError(res, err, 'getCalendar');
    }
};

// ─── Provider: bulk create / upsert availability for a date range ─────────────────────
// POST /availability/bulk
// Accepts a date range + optional weekday filter + time slots (or isBlocked flag)
// and upserts one Availability document per matching date.

exports.createBulk = async (req, res) => {
    try {
        const { activityId, startDate, endDate, weekdays, timeSlots, isBlocked } = req.body;
        const blocked = !!isBlocked;

        if (!activityId || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'activityId, startDate, and endDate are required.' });
        }
        if (!blocked && (!Array.isArray(timeSlots) || timeSlots.length === 0)) {
            return res.status(400).json({ success: false, message: 'Provide at least one timeSlot, or set isBlocked=true.' });
        }

        const activity = await Activity.findById(activityId);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });
        if (String(activity.providerId) !== String(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You can only manage availability for your own activities.' });
        }

        const providerId = req.user.id;
        const start = toDateOnly(startDate);
        const end = toDateOnly(endDate);

        if (end < start) {
            return res.status(400).json({ success: false, message: 'endDate must be on or after startDate.' });
        }
        const diffDays = Math.round((end - start) / 86400000) + 1;
        if (diffDays > 366) {
            return res.status(400).json({ success: false, message: 'Date range cannot exceed 366 days.' });
        }

        const filterWeekdays = Array.isArray(weekdays) && weekdays.length > 0;
        const slotPayload = blocked ? [] : (timeSlots || []);

        const operations = [];
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const dow = d.getUTCDay(); // 0=Sun … 6=Sat
            if (filterWeekdays && !weekdays.includes(dow)) continue;
            const date = new Date(d);
            operations.push({
                updateOne: {
                    filter: { activityId, providerId, date },
                    update: { $set: { timeSlots: slotPayload, isBlocked: blocked } },
                    upsert: true,
                },
            });
        }

        if (operations.length === 0) {
            return res.status(400).json({ success: false, message: 'No matching dates found in the selected range and weekday filter.' });
        }

        await Availability.bulkWrite(operations);

        return res.status(201).json({
            success: true,
            message: `Availability ${blocked ? 'blocked' : 'saved'} for ${operations.length} day(s).`,
            count: operations.length,
        });
    } catch (err) {
        return handleError(res, err, 'createBulk');
    }
};

