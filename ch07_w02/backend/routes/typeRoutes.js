// routes/typeRoutes.js
const express = require('express');
const router = express.Router();
const typeController = require('../controllers/typeController');

router.get('/', typeController.getType);

module.exports = router;