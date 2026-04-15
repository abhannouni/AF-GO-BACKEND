const express = require('express');
const availabilityController = require('../controllers/availability.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public read (MVP)
router.get('/', availabilityController.list);

// Protected write (MVP)
router.post('/', authenticate, authorize('prestataire', 'admin'), availabilityController.create);

module.exports = router;

