const socialMediaService = require('./socialMedia.service');
const { success, created } = require('../../utils/responseFormatter');

async function getPlatforms(req, res, next) {
  try {
    const platforms = await socialMediaService.getPlatforms(req.user.id);
    return success(res, { platforms });
  } catch (err) {
    next(err);
  }
}

async function createPlatform(req, res, next) {
  try {
    const platform = await socialMediaService.createPlatform(req.user.id, req.body);
    return created(res, { platform });
  } catch (err) {
    next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const records = await socialMediaService.getRecords(req.user.id, startDate, endDate);
    return success(res, { records });
  } catch (err) {
    next(err);
  }
}

async function logUsage(req, res, next) {
  try {
    const record = await socialMediaService.logUsage(req.user.id, req.body);
    return created(res, { record });
  } catch (err) {
    next(err);
  }
}

async function getUsageGraph(req, res, next) {
  try {
    const graphData = await socialMediaService.getWeeklyUsageGraph(req.user.id);
    return success(res, { graphData });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPlatforms,
  createPlatform,
  getRecords,
  logUsage,
  getUsageGraph,
};
