const goalsService = require('./goals.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getGoals(req, res, next) {
  try {
    const goals = await goalsService.getGoals(req.user.id, req.query.type);
    return success(res, { goals });
  } catch (err) {
    next(err);
  }
}

async function createGoal(req, res, next) {
  try {
    const goal = await goalsService.createGoal(req.user.id, req.body);
    return created(res, { goal });
  } catch (err) {
    next(err);
  }
}

async function updateGoal(req, res, next) {
  try {
    const goal = await goalsService.updateGoal(req.user.id, req.params.id, req.body);
    return success(res, { goal });
  } catch (err) {
    next(err);
  }
}

async function addAchievement(req, res, next) {
  try {
    const goal = await goalsService.addAchievement(req.user.id, req.params.id, req.body);
    return created(res, { goal });
  } catch (err) {
    next(err);
  }
}

async function deleteAchievement(req, res, next) {
  try {
    const goal = await goalsService.deleteAchievement(req.user.id, req.params.id, req.params.achievementId);
    return success(res, { goal });
  } catch (err) {
    next(err);
  }
}

async function deleteGoal(req, res, next) {
  try {
    await goalsService.deleteGoal(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  addAchievement,
  deleteAchievement,
  deleteGoal,
};
