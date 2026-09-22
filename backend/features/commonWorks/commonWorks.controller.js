const commonWorksService = require('./commonWorks.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getCommonWorks(req, res, next) {
  try {
    const habits = await commonWorksService.getCommonWorks(req.user.id);
    return success(res, { habits });
  } catch (err) {
    next(err);
  }
}

async function createCommonWork(req, res, next) {
  try {
    const habit = await commonWorksService.createCommonWork(req.user.id, req.body);
    return created(res, { habit });
  } catch (err) {
    next(err);
  }
}

async function updateCommonWork(req, res, next) {
  try {
    const habit = await commonWorksService.updateCommonWork(req.user.id, req.params.id, req.body);
    return success(res, { habit });
  } catch (err) {
    next(err);
  }
}

async function deleteCommonWork(req, res, next) {
  try {
    await commonWorksService.deleteCommonWork(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

async function toggleCommonWork(req, res, next) {
  try {
    const { workId, date } = req.body;
    const result = await commonWorksService.toggleCommonWork(req.user.id, workId || req.params.id, date);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCommonWorks,
  createCommonWork,
  updateCommonWork,
  deleteCommonWork,
  toggleCommonWork,
};
