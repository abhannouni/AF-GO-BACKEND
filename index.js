const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./configs/db');
const authRoutes = require('./routes/auth.routes');
const activityRoutes = require('./routes/activity.routes');
const availabilityRoutes = require('./routes/availability.routes');
const bookingRoutes = require('./routes/booking.routes');
const tripRoutes = require('./routes/trip.routes');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors());

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
const API = `/api/${process.env.API_VERSION || 'v1'}`;

app.get(`${API}/health`, (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/activities`, activityRoutes);
app.use(`${API}/availability`, availabilityRoutes);
app.use(`${API}/bookings`, bookingRoutes);
app.use(`${API}/trips`, tripRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[Unhandled error]', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} (${process.env.NODE_ENV})`);
    });
});