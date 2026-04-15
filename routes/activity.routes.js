const express = require('express');
const activityController = require('../controllers/activity.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public
router.get('/', activityController.list);
router.get('/:id', activityController.getById);

// Protected (MVP): prestataire/admin can create; owner/admin can update/delete
router.post('/', authenticate, authorize('prestataire', 'admin'), activityController.create);
router.patch('/:id', authenticate, authorize('prestataire', 'admin'), activityController.update);
router.delete('/:id', authenticate, authorize('prestataire', 'admin'), activityController.remove);

module.exports = router;

