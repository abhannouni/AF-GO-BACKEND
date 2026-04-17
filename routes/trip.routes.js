const express = require('express');
const tripController = require('../controllers/trip.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public
router.get('/', tripController.list);
router.get('/:id', tripController.getById);

// Protected: prestataire/admin can create; owner/admin can update/delete
router.post('/', authenticate, authorize('prestataire', 'admin'), tripController.create);
router.patch('/:id', authenticate, authorize('prestataire', 'admin'), tripController.update);
router.delete('/:id', authenticate, authorize('prestataire', 'admin'), tripController.remove);

module.exports = router;
