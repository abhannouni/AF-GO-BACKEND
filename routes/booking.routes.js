const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Client — create & view own bookings
router.post('/', authenticate, authorize('client', 'admin'), bookingController.create);
router.get('/me', authenticate, bookingController.listMine);

// Provider — view incoming bookings
router.get('/provider', authenticate, authorize('prestataire', 'admin'), bookingController.listAsProvider);

// Owner / provider / admin — update booking status
router.patch('/:id', authenticate, bookingController.updateStatus);

module.exports = router;

