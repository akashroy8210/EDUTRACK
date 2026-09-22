const mongoose = require('mongoose');
const Subject = require('./subject.model');
const ClassSession = require('./schedule.model');
const Holiday = require('./holiday.model');
const AttendanceRecord = require('./attendance.model');
const { parseTimeInterval, getTodayDate, getDayOfWeek, addDays, getCurrentMinutes } = require('../../utils/dateUtils');
const { calculateAttendanceMetrics } = require('../../utils/attendanceCalculator');
const { ApiError } = require('../../middleware/error.middleware');

/**
 * Automatically marks unrecorded past scheduled class dates as 'absent'.
 * 
 * Rules:
 * 1. Only checks dates strictly in the past: startDate <= curr < today.
 * 2. If a session started today or in the future, curr < today is false, preventing false absent creation.
 * 3. Skips any dates marked as full-day holidays or class-specific holidays.
 * 4. Only creates an 'absent' record if neither a class-specific nor subject-level record already exists.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @returns {Promise<void>}
 */
async function autoMarkPastUnrecordedClasses(userId) {
  try {
    const today = getTodayDate();
    const sessions = await ClassSession.find({ userId });
    if (!sessions || sessions.length === 0) return;

    const holidays = await Holiday.find({ userId });
    const records = await AttendanceRecord.find({ userId });
    // Cache existing attendance composite keys to avoid duplicate database queries
    const existingKeySet = new Set(
      records.map(r => `${r.subjectId.toString()}_${r.classId ? r.classId.toString() : ''}_${r.date}`)
    );

    const toInsert = [];

    for (const session of sessions) {
      const startDate = session.startDate || today;
      const endDate = session.endDate || addDays(startDate, 84);

      let curr = startDate;
      // Loop only strictly past calendar days prior to today
      while (curr < today && curr <= endDate) {
        if (getDayOfWeek(curr) === session.day) {
          const isHoliday = holidays.some(h =>
            h.date === curr && (h.type === 'full-day' || h.type === 'full' || (h.classId && h.classId.toString() === session._id.toString()))
          );
          if (!isHoliday) {
            const key = `${session.subjectId.toString()}_${session._id.toString()}_${curr}`;
            const keyNoClass = `${session.subjectId.toString()}__${curr}`;
            if (!existingKeySet.has(key) && !existingKeySet.has(keyNoClass)) {
              toInsert.push({
                userId,
                subjectId: session.subjectId,
                classId: session._id,
                date: curr,
                status: 'absent',
              });
              existingKeySet.add(key);
            }
          }
        }
        curr = addDays(curr, 1);
      }
    }

    if (toInsert.length > 0) {
      await AttendanceRecord.insertMany(toInsert);
    }
  } catch (err) {
    console.warn('Auto-mark past unrecorded classes warning:', err?.message);
  }
}

/**
 * Retrieves all registered subjects for a user, computing dynamic real-time attendance metrics.
 *
 * Metrics computed per subject:
 * - totalClasses: Total scheduled sessions in the full semester interval.
 * - conductedClasses: Classes actually elapsed till today (excluding holidays and upcoming sessions today).
 * - attendedClasses: Count of attended records ('present').
 * - missedClasses: Count of missed records ('absent').
 * - attendancePercentage: (attendedClasses / conductedClasses) * 100.
 * - classesCanSkip: Buffer of classes safe to skip while maintaining >= 75%.
 * - classesNeededFor75: Consecutive classes needed to reach >= 75%.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @returns {Promise<Array<Object>>} List of enriched subject summaries
 */
async function getSubjects(userId) {
  await autoMarkPastUnrecordedClasses(userId);

  const subjects = await Subject.find({ userId });
  const records = await AttendanceRecord.find({ userId });
  const sessions = await ClassSession.find({ userId });
  const holidays = await Holiday.find({ userId });
  const today = getTodayDate();
  const nowMinutes = getCurrentMinutes();

  return subjects.map(sub => {
    const subSessions = sessions.filter(s => s.subjectId.toString() === sub._id.toString());
    const subRecords = records.filter(r => r.subjectId.toString() === sub._id.toString());

    // Calculate total scheduled classes in term and conducted till now in real-time
    let totalScheduledInTerm = 0;
    let conductedDatesCount = 0;

    if (subSessions.length > 0) {
      for (const session of subSessions) {
        const start = session.startDate || today;
        const end = session.endDate || addDays(start, 84);
        let curr = start;
        while (curr <= end) {
          if (getDayOfWeek(curr) === session.day) {
            const isHoliday = holidays.some(h =>
              h.date === curr && (h.type === 'full-day' || h.type === 'full' || (h.classId && h.classId.toString() === session._id.toString()))
            );
            if (!isHoliday) {
              totalScheduledInTerm++;
              if (curr < today) {
                // Past days: conducted
                conductedDatesCount++;
              } else if (curr === today) {
                // Today: count as conducted if attendance was marked (present or absent) OR if class time has got over
                const hasRecord = subRecords.some(r => r.date === today && (!r.classId || r.classId.toString() === session._id.toString()));
                const isClassOver = session.endMinutes !== undefined && session.endMinutes <= nowMinutes;
                if (hasRecord || isClassOver) {
                  conductedDatesCount++;
                }
              }
            }
          }
          curr = addDays(curr, 1);
        }
      }
    }

    // Ensure conducted is at least as large as the attendance records logged
    const totalConducted = Math.max(conductedDatesCount, subRecords.length);
    const totalTerm = Math.max(totalScheduledInTerm, totalConducted);

    const attended = subRecords.filter(r => r.status === 'present').length;
    const missed = subRecords.filter(r => r.status === 'absent').length;
    const metrics = calculateAttendanceMetrics(attended, totalConducted, totalTerm, missed);

    return {
      id: sub._id,
      code: sub.code,
      name: sub.name,
      color: sub.color,
      credits: sub.credits,
      instructor: sub.instructor,
      totalClasses: totalTerm,
      conductedClasses: totalConducted,
      attendedClasses: metrics.attended,
      missedClasses: metrics.missed,
      attendancePercentage: metrics.percentage,
      status: metrics.status,
      classesCanSkip: metrics.classesCanSkip,
      classesNeededFor75: metrics.classesNeededFor75,
    };
  });
}

/**
 * Retrieves comprehensive detail, attendance history, and schedules for a specific subject.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {string|mongoose.Types.ObjectId} subjectId - Target subject ID
 * @returns {Promise<Object>} Subject details, calculated metrics, schedule slots, and attendance history
 */
async function getSubjectDetail(userId, subjectId) {
  const subject = await Subject.findOne({ _id: subjectId, userId });
  if (!subject) {
    throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
  }

  const records = await AttendanceRecord.find({ userId, subjectId }).sort({ date: -1 });
  const attended = records.filter(r => r.status === 'present').length;
  const missed = records.filter(r => r.status === 'absent').length;
  const total = records.length;
  const scheduledClasses = await ClassSession.find({ userId, subjectId });
  const holidays = await Holiday.find({ userId });
  const today = getTodayDate();

  // Calculate total scheduled classes after holiday subtraction
  let totalScheduled = 0;
  for (const session of scheduledClasses) {
    const start = session.startDate || today;
    const end = session.endDate || addDays(start, 84);
    let curr = start;
    while (curr <= end) {
      if (getDayOfWeek(curr) === session.day) {
        const isHoliday = holidays.some(h =>
          h.date === curr && (h.type === 'full-day' || h.type === 'full' || (h.classId && h.classId.toString() === session._id.toString()))
        );
        if (!isHoliday) totalScheduled++;
      }
      curr = addDays(curr, 1);
    }
  }

  const metrics = calculateAttendanceMetrics(attended, total, Math.max(totalScheduled, total), missed);

  return {
    subject: {
      id: subject._id,
      code: subject.code,
      name: subject.name,
      color: subject.color,
      credits: subject.credits,
      instructor: subject.instructor,
    },
    metrics,
    schedule: scheduledClasses,
    records,
  };
}

/**
 * Creates or updates an academic subject for the user.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {Object} data - Subject payload (name, code, color, credits, instructor)
 * @returns {Promise<Object>} Created or updated Subject document
 */
async function createSubject(userId, data) {
  const code = (data.code || data.name || 'SUBJ').trim().toUpperCase();
  let subject = await Subject.findOne({ userId, code });
  if (subject) {
    if (data.name) subject.name = data.name.trim();
    if (data.color) subject.color = data.color;
    if (data.credits) subject.credits = data.credits;
    if (data.instructor !== undefined) subject.instructor = data.instructor;
    await subject.save();
    return subject;
  }

  return await Subject.create({
    userId,
    code,
    name: data.name.trim(),
    color: data.color || '#6366f1',
    credits: data.credits || 4,
    instructor: data.instructor || '',
  });
}

/**
 * Retrieves all weekly class sessions scheduled for a user with populated subject details.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @returns {Promise<Array<Object>>} List of class sessions
 */
async function getSchedule(userId) {
  return await ClassSession.find({ userId }).populate('subjectId', 'name code color');
}

/**
 * Adds a new recurring weekly class session, binding its start date in real-time.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {Object} data - Session details (day, time, room, type, subjectId, subjectName, startDate, endDate)
 * @returns {Promise<Object>} Created ClassSession document
 */
async function addClassSession(userId, data) {
  const { startMinutes, endMinutes } = parseTimeInterval(data.time);
  let resolvedSubjectId = data.subjectId;

  // If subjectId is provided as a valid ObjectId, verify it belongs to this user (prevent IDOR)
  if (resolvedSubjectId && mongoose.Types.ObjectId.isValid(resolvedSubjectId)) {
    const subject = await Subject.findOne({ _id: resolvedSubjectId, userId });
    if (!subject) {
      throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
    }
  } else {
    // If subjectId is missing or not an ObjectId, auto-resolve or create the subject for this user
    const subjName = data.subjectName || 'Course';
    let subject = await Subject.findOne({ userId, name: subjName });
    if (!subject) {
      const code = (subjName.split(' ').map(w => w[0]).join('') || 'SUBJ').toUpperCase().slice(0, 6);
      subject = await Subject.create({
        userId,
        name: subjName,
        code,
        color: '#6366f1',
        credits: 4,
      });
    }
    resolvedSubjectId = subject._id;
  }

  const today = getTodayDate();
  // Real-time: newly created sessions default to today as start date
  const startDate = data.startDate || today;
  const endDate = data.endDate || addDays(startDate, 84);

  return await ClassSession.create({
    userId,
    subjectId: resolvedSubjectId,
    day: data.day,
    time: data.time,
    startMinutes,
    endMinutes,
    room: data.room || 'LH-1',
    type: data.type || 'lecture',
    startDate,
    endDate,
  });
}

/**
 * Deletes a scheduled class session and cascades deletion to associated attendance and holidays.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {string} id - ClassSession ID
 * @returns {Promise<Object>} Deleted ClassSession document
 */
async function deleteClassSession(userId, id) {
  const deleted = await ClassSession.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Class session not found.', 'NOT_FOUND');
  }
  await AttendanceRecord.deleteMany({ userId, classId: id });
  await Holiday.deleteMany({ userId, classId: id });
  return deleted;
}

/**
 * Retrieves all academic holidays configured for a user.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @returns {Promise<Array<Object>>} List of Holiday documents sorted by date
 */
async function getHolidays(userId) {
  return await Holiday.find({ userId }).sort({ date: 1 });
}

/**
 * Adds a new academic holiday (full-day or class-specific) idempotently.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {Object} data - Holiday payload (date, label, type, classId)
 * @returns {Promise<Object>} Created or updated Holiday document
 */
async function addHoliday(userId, data) {
  let validClassId = null;
  if (data.classId) {
    if (!mongoose.Types.ObjectId.isValid(data.classId)) {
      throw new ApiError(400, 'Invalid class session ID.', 'INVALID_ID');
    }
    const session = await ClassSession.findOne({ _id: data.classId, userId });
    if (!session) {
      throw new ApiError(404, 'Class session not found.', 'NOT_FOUND');
    }
    validClassId = session._id;
  }

  // Idempotent upsert to prevent duplicate holiday creation
  return await Holiday.findOneAndUpdate(
    { userId, date: data.date, classId: validClassId },
    {
      label: data.label.trim(),
      type: data.type || (validClassId ? 'class-specific' : 'full'),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * Deletes an academic holiday.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {string} id - Holiday ID
 * @returns {Promise<Object>} Deleted Holiday document
 */
async function deleteHoliday(userId, id) {
  const deleted = await Holiday.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Holiday not found.', 'NOT_FOUND');
  }
  return deleted;
}

/**
 * Records student attendance for a subject session.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {Object} data - Attendance payload (subjectId, classId, date, status)
 * @returns {Promise<Object>} Upserted AttendanceRecord document
 */
async function markAttendance(userId, { subjectId, classId, date, status }) {
  const targetDate = date || getTodayDate();
  let resolvedSubjectId = subjectId;

  // Verify subject belongs to this user (prevent IDOR)
  if (mongoose.Types.ObjectId.isValid(subjectId)) {
    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
    }
    resolvedSubjectId = subject._id;
  } else {
    const found = await Subject.findOne({ userId, $or: [{ code: subjectId }, { name: subjectId }] });
    if (found) {
      resolvedSubjectId = found._id;
    } else {
      throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
    }
  }

  let validClassId = null;
  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    const session = await ClassSession.findOne({ _id: classId, userId });
    if (!session) {
      throw new ApiError(404, 'Class session not found.', 'NOT_FOUND');
    }
    validClassId = session._id;
  }

  // Upsert attendance record for this user, subject, date, and optional class session
  const record = await AttendanceRecord.findOneAndUpdate(
    { userId, subjectId: resolvedSubjectId, date: targetDate, classId: validClassId },
    { status },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return record;
}

/**
 * Deletes an academic subject and cascades deletion to all associated class sessions and attendance records.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {string} id - Subject ID to remove
 * @returns {Promise<Object>} Deleted Subject document
 */
async function deleteSubject(userId, id) {
  const deleted = await Subject.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Subject not found.', 'NOT_FOUND');
  }
  await ClassSession.deleteMany({ userId, subjectId: id });
  await AttendanceRecord.deleteMany({ userId, subjectId: id });
  return deleted;
}

/**
 * Updates properties of a scheduled class session.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @param {string} id - ClassSession ID
 * @param {Object} data - Update fields (day, time, room, type, startDate, endDate)
 * @returns {Promise<Object>} Updated ClassSession document
 */
async function updateClassSession(userId, id, data) {
  const session = await ClassSession.findOne({ _id: id, userId });
  if (!session) {
    throw new ApiError(404, 'Class session not found.', 'NOT_FOUND');
  }

  if (data.day) session.day = data.day;
  if (data.time) {
    session.time = data.time;
    const { startMinutes, endMinutes } = parseTimeInterval(data.time);
    session.startMinutes = startMinutes;
    session.endMinutes = endMinutes;
  }
  if (data.room) session.room = data.room;
  if (data.type) session.type = data.type;
  if (data.startDate) session.startDate = data.startDate;
  if (data.endDate) session.endDate = data.endDate;

  await session.save();
  return session;
}

/**
 * Calculates overall academic attendance summary across all registered subjects.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated student user ID
 * @returns {Promise<Object>} Aggregate statistics including overallPercentage, totalAttended, totalConducted, subjects list, and history
 */
async function getAttendanceSummary(userId) {
  const subjects = await getSubjects(userId);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
  const totalConducted = subjects.reduce((sum, s) => sum + (s.conductedClasses || s.totalClasses), 0);
  const totalClasses = subjects.reduce((sum, s) => sum + s.totalClasses, 0);
  const totalMissed = subjects.reduce((sum, s) => sum + (s.missedClasses || 0), 0);
  const overall = calculateAttendanceMetrics(totalAttended, totalConducted, totalClasses, totalMissed);
  const records = await AttendanceRecord.find({ userId }).sort({ date: 1 });

  return {
    overallPercentage: overall.percentage,
    overallStatus: overall.status,
    totalAttended,
    totalConducted,
    totalClasses,
    subjects,
    history: records.map(r => ({
      id: r._id,
      subjectId: r.subjectId,
      classId: r.classId,
      date: r.date,
      status: r.status,
    })),
  };
}

module.exports = {
  autoMarkPastUnrecordedClasses,
  getSubjects,
  getSubjectDetail,
  createSubject,
  deleteSubject,
  getSchedule,
  addClassSession,
  updateClassSession,
  deleteClassSession,
  getHolidays,
  addHoliday,
  deleteHoliday,
  markAttendance,
  getAttendanceSummary,
};
