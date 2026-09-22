const dashboardService = require('./dashboard.service');
const { success } = require('../../utils/responseFormatter');

async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user.id);
    return success(res, summary);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
};
