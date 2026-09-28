const leetcodeService = require('./leetcode.service');
const { success } = require('../../utils/responseFormatter');

async function getDailyProblem(req, res, next) {
  try {
    const daily = await leetcodeService.getDailyProblem(req.user?.id);
    return success(res, { daily });
  } catch (err) {
    next(err);
  }
}

async function getUserProfile(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await leetcodeService.getUserProfile(username);
    return success(res, { profile });
  } catch (err) {
    next(err);
  }
}

async function connectAccount(req, res, next) {
  try {
    const { username } = req.body;
    const profile = await leetcodeService.connectAccount(req.user.id, username);
    return success(res, { profile, message: 'LeetCode account connected successfully' });
  } catch (err) {
    next(err);
  }
}

async function updateDailyStatus(req, res, next) {
  try {
    const record = await leetcodeService.updateDailyStatus(req.user.id, req.body);
    return success(res, { record });
  } catch (err) {
    next(err);
  }
}

async function getDailyHistory(req, res, next) {
  try {
    const history = await leetcodeService.getDailyHistory(req.user.id);
    return success(res, history);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDailyProblem,
  getUserProfile,
  connectAccount,
  updateDailyStatus,
  getDailyHistory,
};
