const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    credits: {
      type: Number,
      default: 4,
    },
    instructor: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, code: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
