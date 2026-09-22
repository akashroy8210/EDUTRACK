const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    time: {
      type: String, // e.g. '10:00 AM'
      required: true,
    },
    room: {
      type: String,
      default: 'Hall A',
    },
    type: {
      type: String,
      enum: ['midterm', 'final', 'quiz'],
      default: 'midterm',
    },
    weightage: {
      type: String,
      default: '25%',
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

examSchema.index({ userId: 1, date: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
