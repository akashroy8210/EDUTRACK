const mongoose = require('mongoose');

const classSessionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    time: {
      type: String,
      required: true, // e.g. '09:00 - 10:00'
    },
    startMinutes: {
      type: Number,
      required: true,
    },
    endMinutes: {
      type: Number,
      required: true,
    },
    room: {
      type: String,
      default: 'LH-1',
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial'],
      default: 'lecture',
    },
    startDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    endDate: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    color: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

classSessionSchema.index({ userId: 1, day: 1, startMinutes: 1 });

const ClassSession = mongoose.model('ClassSession', classSessionSchema);

module.exports = ClassSession;
