const mongoose = require('mongoose');

const selfStudySchema = new mongoose.Schema(
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
      default: '',
      trim: true,
    },
    activity: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    startTime: {
      type: String, // 'HH:MM'
      required: true,
    },
    endTime: {
      type: String, // 'HH:MM'
      required: true,
    },
    plannedMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'in-progress', 'completed', 'missed'],
      default: 'upcoming',
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

selfStudySchema.index({ userId: 1, date: 1, startTime: 1 });

const SelfStudy = mongoose.model('SelfStudy', selfStudySchema);

module.exports = SelfStudy;
