const examsService = require('./exams.service');
const { success, created, noContent } = require('../../utils/responseFormatter');

async function getExams(req, res, next) {
  try {
    const exams = await examsService.getExams(req.user.id);
    return success(res, { exams });
  } catch (err) {
    next(err);
  }
}

async function createExam(req, res, next) {
  try {
    const exam = await examsService.createExam(req.user.id, req.body);
    return created(res, { exam });
  } catch (err) {
    next(err);
  }
}

async function updateExam(req, res, next) {
  try {
    const exam = await examsService.updateExam(req.user.id, req.params.id, req.body);
    return success(res, { exam });
  } catch (err) {
    next(err);
  }
}

async function deleteExam(req, res, next) {
  try {
    await examsService.deleteExam(req.user.id, req.params.id);
    return noContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExams,
  createExam,
  updateExam,
  deleteExam,
};
