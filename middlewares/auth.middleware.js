const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Authentication middleware ────────────────────────────────────────────────
// Verifies the JWT from the Authorization header and attaches the user to req.

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please provide a valid token.',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'The user belonging to this token no longer exists.',
            });
        }

        req.user = { id: user._id, role: user.role, email: user.email, username: user.username };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

// ─── Role-based authorization middleware ─────────────────────────────────────
// Usage: authorize('admin')  or  authorize('admin', 'prestataire')

exports.authorize = (...roles) =>
    (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${roles.join(', ')}.`,
            });
        }

        next();
    };

// ─── Convenience role guards ──────────────────────────────────────────────────

exports.isAdmin = exports.authorize('admin');
exports.isClient = exports.authorize('client');
exports.isPrestataire = exports.authorize('prestataire');
exports.isAdminOrPrestataire = exports.authorize('admin', 'prestataire');
