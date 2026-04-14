const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// ─── Validation rules ─────────────────────────────────────────────────────────

const registerValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),

    body('role')
        .optional()
        .isIn(['prestataire', 'client', 'admin']).withMessage('Role must be one of: prestataire, client, admin'),
];

const loginValidation = [
    // Accept 'identifier' (email or username) or plain 'email' field
    body('identifier')
        .if(body('email').not().exists())
        .trim()
        .notEmpty().withMessage('Email or username is required'),

    body('email')
        .if(body('identifier').not().exists())
        .trim()
        .notEmpty().withMessage('Email or username is required'),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login
router.post('/login', loginValidation, authController.login);

module.exports = router;
