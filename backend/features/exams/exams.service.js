const mongoose = require('mongoose');
const Exam = require('./exam.model');
const Subject = require('../academics/subject.model');
const { ApiError } = require('../../middleware/error.middleware');

async function getExams(userId) {
  return await Exam.find({ userId }).sort({ date: 1 });
}

async function createExam(userId, data) {
  let validSubjectId = null;
  if (data.subjectId) {
    if (!mongoose.Types.ObjectId.isValid(data.subjectId)) {
      throw new ApiError(400, 'Invalid subject ID format.', 'INVALID_ID');
    }
    const subject = await Subject.findOne({ _id: data.subjectId, userId });
    if (!subject) {
      throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
    }
    validSubjectId = subject._id;
  }

  return await Exam.create({
    userId,
    subjectId: validSubjectId,
    subjectName: data.subjectName.trim(),
    subjectCode: (data.subjectCode || data.code || (data.subjectName ? data.subjectName.slice(0, 6) : 'EXAM')).trim().toUpperCase(),
    date: data.date,
    time: data.time,
    room: data.room || 'Hall A',
    type: data.type || 'midterm',
    weightage: data.weightage || '25%',
    status: data.status || 'upcoming',
  });
}

async function updateExam(userId, id, data) {
  const exam = await Exam.findOne({ _id: id, userId });
  if (!exam) {
    throw new ApiError(404, 'Exam not found.', 'NOT_FOUND');
  }

  if (data.subjectId) {
    if (!mongoose.Types.ObjectId.isValid(data.subjectId)) {
      throw new ApiError(400, 'Invalid subject ID format.', 'INVALID_ID');
    }
    const subject = await Subject.findOne({ _id: data.subjectId, userId });
    if (!subject) {
      throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
    }
  }

  const fields = ['subjectId', 'subjectName', 'subjectCode', 'date', 'time', 'room', 'type', 'weightage', 'status'];
  fields.forEach(f => {
    if (data[f] !== undefined) exam[f] = data[f];
  });

  await exam.save();
  return exam;
}

async function deleteExam(userId, id) {
  const deleted = await Exam.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Exam not found.', 'NOT_FOUND');
  }
  return deleted;
}

module.exports = {
  getExams,
  createExam,
  updateExam,
  deleteExam,
};
