const mongoose = require('mongoose');

const commonWorkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: 'Sparkle',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const CommonWork = mongoose.model('CommonWork', commonWorkSchema);

module.exports = CommonWork;
