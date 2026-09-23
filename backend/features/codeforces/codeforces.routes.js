const express = require('express');
const router = express.Router();
const codeforcesController = require('./codeforces.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

// Public or authenticated endpoints for Codeforces proxying
router.get('/contests', codeforcesController.getUpcomingContests);
router.get('/user/:handle', codeforcesController.getUserInfo);
router.get('/rating/:handle', codeforcesController.getUserRatingHistory);
router.get('/status/:handle', codeforcesController.getUserStatus);

module.exports = router;
