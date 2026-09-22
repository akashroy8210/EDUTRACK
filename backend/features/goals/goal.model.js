const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['1-month', 'short-term', 'long-term'],
      default: 'short-term',
      required: true,
    },
    deadline: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'achieved', 'dropped'],
      default: 'active',
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
    },
    achievements: [achievementSchema],
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, type: 1, status: 1 });

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
