const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSession',
      default: null,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      required: true,
    },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ userId: 1, subjectId: 1, date: 1, classId: 1 }, { unique: true });

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = AttendanceRecord;
