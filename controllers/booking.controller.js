const Booking = require('../models/Booking');

const pick = (obj, keys) =>
    keys.reduce((acc, k) => {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, {});

exports.create = async (req, res) => {
    try {
        const payload = pick(req.body, [
            'userId',
            'activityId',
            'providerId',
            'date',
            'time',
            'participants',
            'totalPrice',
            'status',
            'paymentStatus',
        ]);

        // MVP default: userId from token if not provided
        if (!payload.userId && req.user?.id) payload.userId = req.user.id;

        const booking = await Booking.create(payload);
        return res.status(201).json({ success: true, message: 'Booking created', data: booking });
    } catch (err) {
        console.error('[booking.create]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.listMine = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: bookings });
    } catch (err) {
        console.error('[booking.listMine]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.listAsProvider = async (req, res) => {
    try {
        const providerId = req.user.id;
        const bookings = await Booking.find({ providerId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: bookings });
    } catch (err) {
        console.error('[booking.listAsProvider]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        const isOwner = req.user?.id && String(booking.userId) === String(req.user.id);
        const isProvider = req.user?.id && String(booking.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';

        if (!isOwner && !isProvider && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const payload = pick(req.body, ['status', 'paymentStatus']);
        Object.assign(booking, payload);
        await booking.save();

        return res.status(200).json({ success: true, message: 'Booking updated', data: booking });
    } catch (err) {
        console.error('[booking.updateStatus]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

