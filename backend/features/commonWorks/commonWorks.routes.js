const express = require('express');
const commonWorksController = require('./commonWorks.controller');
const { validateCreateCommonWork } = require('./commonWorks.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', commonWorksController.getCommonWorks);
router.post('/', validateMiddleware(validateCreateCommonWork), commonWorksController.createCommonWork);
router.put('/:id', commonWorksController.updateCommonWork);
router.delete('/:id', commonWorksController.deleteCommonWork);
router.post('/:id/toggle', commonWorksController.toggleCommonWork);

module.exports = router;
