const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));
router.get('/', userController.listUsers);
router.patch('/:id/role', userController.updateRole);

module.exports = router;
