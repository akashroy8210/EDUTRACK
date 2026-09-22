const express = require('express');
const dashboardController = require('./dashboard.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);

module.exports = router;
