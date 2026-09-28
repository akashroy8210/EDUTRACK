const express = require('express');
const router = express.Router();
const leetcodeController = require('./leetcode.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

// Public endpoints
router.get('/daily', (req, res, next) => {
  // Pass to optional auth if token is present
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  if (authHeader || cookieToken) {
    return authMiddleware(req, res, next);
  }
  next();
}, leetcodeController.getDailyProblem);

router.get('/user/:username', leetcodeController.getUserProfile);

// Authenticated endpoints
router.use(authMiddleware);

router.post('/connect', leetcodeController.connectAccount);
router.post('/daily/status', leetcodeController.updateDailyStatus);
router.get('/history', leetcodeController.getDailyHistory);

module.exports = router;
