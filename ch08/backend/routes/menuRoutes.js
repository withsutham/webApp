// routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const ratingController = require('../controllers/ratingController');
const { authenticate, optionalAuthenticate, requireRole } = require('../middleware/auth');

router.get('/', optionalAuthenticate, menuController.getMenu);
router.get('/:id/ratings', optionalAuthenticate, ratingController.getRatings);
router.post('/:id/ratings', authenticate, requireRole('user'), ratingController.createRating);
router.put('/:id/ratings/me', authenticate, requireRole('user'), ratingController.updateRating);
router.post('/', authenticate, requireRole('admin'), menuController.createMenu);
router.put('/:id', authenticate, requireRole('admin'), menuController.updateMenu);
router.delete('/:id', authenticate, requireRole('admin'), menuController.deleteMenu);

module.exports = router;
