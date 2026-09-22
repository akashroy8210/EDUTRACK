const express = require('express');
const authController = require('./auth.controller');
const { validateRegister, validateLogin } = require('./auth.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { rateLimiterMiddleware } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

router.post(
  '/register',
  rateLimiterMiddleware(20, 60 * 1000),
  validateMiddleware(validateRegister),
  authController.register
);

router.post(
  '/login',
  rateLimiterMiddleware(30, 60 * 1000),
  validateMiddleware(validateLogin),
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
