const Availability = require('../models/Availability');

const pick = (obj, keys) =>
    keys.reduce((acc, k) => {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, {});

exports.create = async (req, res) => {
    try {
        const payload = pick(req.body, ['activityId', 'date', 'timeSlots']);
        const availability = await Availability.create(payload);
        return res.status(201).json({ success: true, message: 'Availability created', data: availability });
    } catch (err) {
        console.error('[availability.create]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.list = async (req, res) => {
    try {
        const { activityId, date } = req.query;
        const filter = {};
        if (activityId) filter.activityId = activityId;
        if (date) filter.date = new Date(date);

        const items = await Availability.find(filter).sort({ date: 1 });
        return res.status(200).json({ success: true, data: items });
    } catch (err) {
        console.error('[availability.list]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

