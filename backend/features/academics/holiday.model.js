const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
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
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['full', 'full-day', 'class-specific'],
      default: 'full',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSession',
      default: null,
    },
  },
  { timestamps: true }
);

holidaySchema.index({ userId: 1, date: 1, classId: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
