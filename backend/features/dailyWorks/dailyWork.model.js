const mongoose = require('mongoose');

const dailyWorkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      required: true,
    },
    type: {
      type: String,
      enum: ['daily', 'permanent'],
      default: 'daily',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: String, // 'YYYY-MM-DD'
      default: null,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    carriedFromDate: {
      type: String, // 'YYYY-MM-DD'
      default: null,
    },
  },
  { timestamps: true }
);

dailyWorkSchema.index({ userId: 1, date: 1, completed: 1 });
dailyWorkSchema.index({ userId: 1, completed: 1, priority: 1 });

const DailyWork = mongoose.model('DailyWork', dailyWorkSchema);

module.exports = DailyWork;
