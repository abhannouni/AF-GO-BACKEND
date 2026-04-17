const Trip = require('../models/Trip');

const pick = (obj, keys) =>
    keys.reduce((acc, k) => {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, {});

exports.list = async (req, res) => {
    try {
        const { region, category, featured } = req.query;
        const filter = {};
        if (region) filter.region = region;
        if (category) filter.category = category;
        if (featured !== undefined) filter.featured = featured === 'true';

        const trips = await Trip.find(filter).sort({ featured: -1, createdAt: -1 });
        return res.status(200).json({ success: true, data: trips });
    } catch (err) {
        console.error('[trip.list]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getById = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
        return res.status(200).json({ success: true, data: trip });
    } catch (err) {
        console.error('[trip.getById]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.create = async (req, res) => {
    try {
        const payload = pick(req.body, [
            'title', 'description', 'region', 'category', 'price', 'duration',
            'image', 'featured', 'location', 'included', 'excluded', 'maxParticipants', 'rating',
        ]);

        if (!payload.providerId && req.user?.id) payload.providerId = req.user.id;

        const trip = await Trip.create(payload);
        return res.status(201).json({ success: true, message: 'Trip created', data: trip });
    } catch (err) {
        console.error('[trip.create]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

        const isOwner = req.user?.id && String(trip.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const payload = pick(req.body, [
            'title', 'description', 'region', 'category', 'price', 'duration',
            'image', 'featured', 'location', 'included', 'excluded', 'maxParticipants', 'rating',
        ]);

        Object.assign(trip, payload);
        await trip.save();

        return res.status(200).json({ success: true, message: 'Trip updated', data: trip });
    } catch (err) {
        console.error('[trip.update]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.remove = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

        const isOwner = req.user?.id && String(trip.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await Trip.deleteOne({ _id: trip._id });
        return res.status(200).json({ success: true, message: 'Trip deleted' });
    } catch (err) {
        console.error('[trip.remove]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
