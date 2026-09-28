const mongoose = require('mongoose');

const leetcodeDailySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    problemNumber: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleSlug: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['not-started', 'attempted', 'solved'],
      default: 'not-started',
    },
    solvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leetcodeDailySchema.index({ userId: 1, date: 1 }, { unique: true });

const LeetCodeDaily = mongoose.model('LeetCodeDaily', leetcodeDailySchema);

module.exports = LeetCodeDaily;
