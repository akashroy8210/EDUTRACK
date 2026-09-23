const codeforcesService = require('./codeforces.service');

async function getUserInfo(req, res, next) {
  try {
    const { handle } = req.params;
    const user = await codeforcesService.getUserInfo(handle);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function getUpcomingContests(req, res, next) {
  try {
    const contests = await codeforcesService.getUpcomingContests();
    res.json({ success: true, contests });
  } catch (err) {
    next(err);
  }
}

async function getUserRatingHistory(req, res, next) {
  try {
    const { handle } = req.params;
    const ratingHistory = await codeforcesService.getUserRatingHistory(handle);
    res.json({ success: true, ratingHistory });
  } catch (err) {
    next(err);
  }
}

async function getUserStatus(req, res, next) {
  try {
    const { handle } = req.params;
    const status = await codeforcesService.getUserStatus(handle);
    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserInfo,
  getUpcomingContests,
  getUserRatingHistory,
  getUserStatus,
};
