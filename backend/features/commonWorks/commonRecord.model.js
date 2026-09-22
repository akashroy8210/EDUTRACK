const mongoose = require('mongoose');

const commonRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommonWork',
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

commonRecordSchema.index({ userId: 1, workId: 1, date: 1 }, { unique: true });

const CommonRecord = mongoose.model('CommonRecord', commonRecordSchema);

module.exports = CommonRecord;
