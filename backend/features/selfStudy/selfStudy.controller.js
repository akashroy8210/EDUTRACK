const selfStudyService = require('./selfStudy.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getSessions(req, res, next) {
  try {
    const sessions = await selfStudyService.getSessions(req.user.id, req.query);
    return success(res, { sessions });
  } catch (err) {
    next(err);
  }
}

async function createSession(req, res, next) {
  try {
    const session = await selfStudyService.createSession(req.user.id, req.body);
    return created(res, { session });
  } catch (err) {
    next(err);
  }
}

async function updateSession(req, res, next) {
  try {
    const session = await selfStudyService.updateSession(req.user.id, req.params.id, req.body);
    return success(res, { session });
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    await selfStudyService.deleteSession(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

async function logTimer(req, res, next) {
  try {
    const session = await selfStudyService.logTimer(req.user.id, req.params.id, req.body);
    return success(res, { session });
  } catch (err) {
    next(err);
  }
}

async function getStudySummary(req, res, next) {
  try {
    const summary = await selfStudyService.getStudySummary(req.user.id);
    return success(res, summary);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  logTimer,
  getStudySummary,
};
