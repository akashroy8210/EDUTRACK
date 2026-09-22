const express = require('express');
const profileController = require('./profile.controller');
const { validateProfileUpdate } = require('./profile.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/', validateMiddleware(validateProfileUpdate), profileController.updateProfile);

module.exports = router;
