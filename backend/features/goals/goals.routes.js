const express = require('express');
const goalsController = require('./goals.controller');
const { validateCreateGoal, validateAchievement } = require('./goals.validation');
const { validateMiddleware } = require('../../middleware/validate.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', goalsController.getGoals);
router.post('/', validateMiddleware(validateCreateGoal), goalsController.createGoal);
router.put('/:id', goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);
router.post('/:id/achievements', validateMiddleware(validateAchievement), goalsController.addAchievement);
router.delete('/:id/achievements/:achievementId', goalsController.deleteAchievement);

module.exports = router;
