const mongoose = require('mongoose');

const socialRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platformId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialPlatform',
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    minutesSpent: {
      type: Number,
      required: true,
      min: [0, 'Minutes cannot be negative'],
    },
  },
  { timestamps: true }
);

socialRecordSchema.index({ userId: 1, platformId: 1, date: 1 }, { unique: true });

const SocialRecord = mongoose.model('SocialRecord', socialRecordSchema);

module.exports = SocialRecord;
