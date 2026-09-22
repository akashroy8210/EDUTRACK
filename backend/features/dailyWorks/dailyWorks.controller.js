const dailyWorksService = require('./dailyWorks.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getDailyWorks(req, res, next) {
  try {
    const tasks = await dailyWorksService.getDailyWorks(req.user.id, req.query.filter);
    return success(res, { tasks });
  } catch (err) {
    next(err);
  }
}

async function createDailyWork(req, res, next) {
  try {
    const task = await dailyWorksService.createDailyWork(req.user.id, req.body);
    return created(res, { task });
  } catch (err) {
    next(err);
  }
}

async function toggleDailyWork(req, res, next) {
  try {
    const { forceConfirmLowerPriority } = req.body;
    const task = await dailyWorksService.toggleDailyWork(req.user.id, req.params.id, Boolean(forceConfirmLowerPriority));
    return success(res, { task });
  } catch (err) {
    next(err);
  }
}

async function updatePriority(req, res, next) {
  try {
    const { priority } = req.body;
    const task = await dailyWorksService.updatePriority(req.user.id, req.params.id, priority);
    return success(res, { task });
  } catch (err) {
    next(err);
  }
}

async function updateDailyWork(req, res, next) {
  try {
    const task = await dailyWorksService.updateDailyWork(req.user.id, req.params.id, req.body);
    return success(res, { task });
  } catch (err) {
    next(err);
  }
}

async function deleteDailyWork(req, res, next) {
  try {
    await dailyWorksService.deleteDailyWork(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

async function resetDailyWorks(req, res, next) {
  try {
    const result = await dailyWorksService.resetDailyWorks(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function getProductivityChart(req, res, next) {
  try {
    const chartData = await dailyWorksService.getProductivityChart(req.user.id);
    return success(res, { chartData });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDailyWorks,
  createDailyWork,
  toggleDailyWork,
  updatePriority,
  updateDailyWork,
  deleteDailyWork,
  resetDailyWorks,
  getProductivityChart,
};
