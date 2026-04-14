const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

const sanitizeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
});

// ─── Register ─────────────────────────────────────────────────────────────────

exports.register = async (req, res) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }

    const { username, email, password, role } = req.body;

    try {
        // 2. Check for duplicate email or username
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email.toLowerCase() ? 'email' : 'username';
            return res.status(409).json({
                success: false,
                message: `A user with this ${field} already exists`,
            });
        }

        // 3. Create user (password hashed by pre-save hook)
        const user = await User.create({ username, email, password, role });

        // 4. Generate token
        const token = signToken(user._id, user.role);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: sanitizeUser(user),
        });
    } catch (err) {
        // Mongoose duplicate-key error (race condition safety net)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: `A user with this ${field} already exists`,
            });
        }

        console.error('[register]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
    // 1. Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }

    // Accept either 'identifier' or 'email' field
    const identifier = (req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;

    try {
        // 2. Find user by email or username, explicitly selecting password
        const user = await User.findOne({
            $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // 3. Compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // 4. Generate token
        const token = signToken(user._id, user.role);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error('[login]', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
