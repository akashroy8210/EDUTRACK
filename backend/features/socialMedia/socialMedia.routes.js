const express = require('express');
const socialMediaController = require('./socialMedia.controller');
const { validatePlatform, validateRecord } = require('./socialMedia.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/platforms', socialMediaController.getPlatforms);
router.post('/platforms', validateMiddleware(validatePlatform), socialMediaController.createPlatform);

router.get('/records', socialMediaController.getRecords);
router.post('/records', validateMiddleware(validateRecord), socialMediaController.logUsage);
router.post('/usage', validateMiddleware(validateRecord), socialMediaController.logUsage);
router.get('/graph', socialMediaController.getUsageGraph);

module.exports = router;
