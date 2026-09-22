const express = require('express');
const dailyWorksController = require('./dailyWorks.controller');
const { validateCreateDailyWork } = require('./dailyWorks.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', dailyWorksController.getDailyWorks);
router.post('/', validateMiddleware(validateCreateDailyWork), dailyWorksController.createDailyWork);
router.post('/:id/toggle', dailyWorksController.toggleDailyWork);
router.patch('/:id/priority', dailyWorksController.updatePriority);
router.put('/:id', dailyWorksController.updateDailyWork);
router.delete('/:id', dailyWorksController.deleteDailyWork);
router.post('/reset', dailyWorksController.resetDailyWorks);
router.get('/chart', dailyWorksController.getProductivityChart);

module.exports = router;
