const Activity = require('../models/Activity');

const pick = (obj, keys) =>
    keys.reduce((acc, k) => {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, {});

const withCapacity = (activityDoc) => {
    const data = activityDoc?.toObject ? activityDoc.toObject() : activityDoc;
    const capacity = data?.capacity ?? data?.maxParticipants ?? null;
    return { ...data, capacity };
};

exports.create = async (req, res) => {
    try {
        const payload = pick(req.body, [
            'title',
            'description',
            'city',
            'category',
            'price',
            'duration',
            'images',
            'providerId',
            'location',
            'included',
            'excluded',
            'capacity',
            'maxParticipants',
            'rating',
        ]);

        if (payload.capacity == null && payload.maxParticipants != null) {
            payload.capacity = payload.maxParticipants;
        }

        // MVP default: if providerId not sent, use authenticated user
        if (!payload.providerId && req.user?.id) payload.providerId = req.user.id;

        const activity = await Activity.create(payload);
        return res.status(201).json({ success: true, message: 'Activity created', data: withCapacity(activity) });
    } catch (err) {
        console.error('[activity.create]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.list = async (req, res) => {
    try {
        const { city, category, providerId } = req.query;
        const filter = {};
        if (city) filter.city = city;
        if (category) filter.category = category;
        if (providerId) filter.providerId = providerId;

        const activities = await Activity.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: activities.map(withCapacity) });
    } catch (err) {
        console.error('[activity.list]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getById = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
        return res.status(200).json({ success: true, data: withCapacity(activity) });
    } catch (err) {
        console.error('[activity.getById]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.update = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

        const isOwner = req.user?.id && String(activity.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const payload = pick(req.body, [
            'title',
            'description',
            'city',
            'category',
            'price',
            'duration',
            'images',
            'location',
            'included',
            'excluded',
            'capacity',
            'maxParticipants',
            'rating',
        ]);

        if (payload.capacity == null && payload.maxParticipants != null) {
            payload.capacity = payload.maxParticipants;
        }

        Object.assign(activity, payload);
        await activity.save();

        return res.status(200).json({ success: true, message: 'Activity updated', data: withCapacity(activity) });
    } catch (err) {
        console.error('[activity.update]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.remove = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

        const isOwner = req.user?.id && String(activity.providerId) === String(req.user.id);
        const isAdmin = req.user?.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await Activity.deleteOne({ _id: activity._id });
        return res.status(200).json({ success: true, message: 'Activity deleted' });
    } catch (err) {
        console.error('[activity.remove]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

