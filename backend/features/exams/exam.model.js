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
      default: '',
    },
    room: {
      type: String,
      default: 'Hall A',
    },
    syllabus: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['end-sem', 'mid-sem', 'quiz', 'assignment', 'midterm', 'final'],
      default: 'quiz',
    },
    weightage: {
      type: String,
      default: '25%',
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'missed'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

examSchema.index({ userId: 1, date: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
