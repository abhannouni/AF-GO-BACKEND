const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Client
router.get('/me', authenticate, bookingController.listMine);
router.post('/', authenticate, authorize('client', 'admin'), bookingController.create);

// Provider
router.get('/provider', authenticate, authorize('prestataire', 'admin'), bookingController.listAsProvider);

// Update status/payment status (owner/provider/admin)
router.patch('/:id', authenticate, bookingController.updateStatus);

module.exports = router;

