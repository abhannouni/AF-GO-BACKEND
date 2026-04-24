const express = require('express');
const availabilityController = require('../controllers/availability.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public reads
router.get('/', availabilityController.list);                                                           // list records
router.get('/slots', availabilityController.getSlots);                                                  // annotated slots with remaining capacity
router.get('/calendar', availabilityController.getCalendar);                                            // month view per-day status

// Protected writes — providers only
router.post('/', authenticate, authorize('prestataire', 'admin'), availabilityController.create);
router.post('/bulk', authenticate, authorize('prestataire', 'admin'), availabilityController.createBulk); // bulk date-range setup
router.patch('/:id', authenticate, authorize('prestataire', 'admin'), availabilityController.update);
router.delete('/:id', authenticate, authorize('prestataire', 'admin'), availabilityController.remove);

module.exports = router;

