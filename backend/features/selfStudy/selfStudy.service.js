const mongoose = require('mongoose');
const SelfStudy = require('./selfStudy.model');
const Subject = require('../academics/subject.model');
const { getTodayDate, addDays, getCurrentMinutes } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function calculateDuration(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end >= start) {
    return Math.max(15, end - start);
  }
  // Overnight slot
  return Math.max(15, 24 * 60 - start + end);
}

async function getSessions(userId, { date, startDate, endDate }) {
  const query = { userId };
  if (date) {
    query.date = date;
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const sessions = await SelfStudy.find(query).sort({ date: 1, startTime: 1 });
  const today = getTodayDate();
  const nowMins = getCurrentMinutes();

  // Auto-mark past unstarted sessions as missed
  for (const s of sessions) {
    if (s.status === 'upcoming') {
      if (s.date < today) {
        s.status = 'missed';
        await s.save();
      } else if (s.date === today) {
        const endMins = timeToMinutes(s.endTime);
        if (nowMins > endMins && s.actualMinutes === 0) {
          s.status = 'missed';
          await s.save();
        }
      }
    }
  }

  return sessions;
}

async function createSession(userId, data) {
  const today = getTodayDate();
  const sessionDate = data.date || today;
  const startTime = (data.startTime || '09:00').trim();
  const endTime = (data.endTime || '10:00').trim();
  const plannedMinutes = data.plannedMinutes || calculateDuration(startTime, endTime);

  let validSubjectId = null;
  let subjectName = (data.subjectName || data.activity || 'Self Study').trim();

  if (data.subjectId && mongoose.Types.ObjectId.isValid(data.subjectId)) {
    const subject = await Subject.findOne({ _id: data.subjectId, userId });
    if (subject) {
      validSubjectId = subject._id;
      subjectName = subject.name;
    }
  }

  return await SelfStudy.create({
    userId,
    subjectId: validSubjectId,
    subjectName,
    activity: (data.activity || subjectName).trim(),
    date: sessionDate,
    startTime,
    endTime,
    plannedMinutes,
    actualMinutes: 0,
    status: 'upcoming',
    notes: (data.notes || '').trim(),
    color: data.color || '#6366f1',
  });
}

async function updateSession(userId, id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }

  const session = await SelfStudy.findOne({ _id: id, userId });
  if (!session) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }

  if (data.subjectId && mongoose.Types.ObjectId.isValid(data.subjectId)) {
    const subject = await Subject.findOne({ _id: data.subjectId, userId });
    if (subject) {
      session.subjectId = subject._id;
      session.subjectName = subject.name;
    }
  }

  const fields = ['activity', 'date', 'startTime', 'endTime', 'status', 'notes', 'color', 'plannedMinutes', 'actualMinutes'];
  fields.forEach(f => {
    if (data[f] !== undefined) session[f] = data[f];
  });

  if (data.startTime || data.endTime) {
    session.plannedMinutes = calculateDuration(session.startTime, session.endTime);
  }

  await session.save();
  return session;
}

async function deleteSession(userId, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }

  const deleted = await SelfStudy.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }
  return deleted;
}

async function logTimer(userId, id, { actualMinutes, status }) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }

  const session = await SelfStudy.findOne({ _id: id, userId });
  if (!session) {
    throw new ApiError(404, 'Study session not found.', 'NOT_FOUND');
  }

  if (actualMinutes !== undefined) {
    session.actualMinutes = Math.max(0, Number(actualMinutes));
  }
  if (status && ['upcoming', 'in-progress', 'completed', 'missed'].includes(status)) {
    session.status = status;
    if (status === 'completed') {
      session.completedAt = new Date();
    }
  }

  await session.save();
  return session;
}

async function getStudySummary(userId) {
  const today = getTodayDate();
  const todaySessions = await SelfStudy.find({ userId, date: today });

  let plannedMinutesToday = 0;
  let actualMinutesToday = 0;
  let completedCountToday = 0;

  todaySessions.forEach(s => {
    plannedMinutesToday += s.plannedMinutes || 0;
    actualMinutesToday += s.actualMinutes || 0;
    if (s.status === 'completed') completedCountToday++;
  });

  const remainingMinutesToday = Math.max(0, plannedMinutesToday - actualMinutesToday);

  // 7-day weekly breakdown
  const startWeek = addDays(today, -6);
  const weekSessions = await SelfStudy.find({
    userId,
    date: { $gte: startWeek, $lte: today },
  });

  const dailyMap = new Map();
  weekSessions.forEach(s => {
    if (!dailyMap.has(s.date)) {
      dailyMap.set(s.date, { planned: 0, actual: 0 });
    }
    const cur = dailyMap.get(s.date);
    cur.planned += s.plannedMinutes || 0;
    cur.actual += s.actualMinutes || 0;
  });

  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const dateObj = new Date(d);
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const stat = dailyMap.get(d) || { planned: 0, actual: 0 };
    weeklyTrend.push({
      date: d,
      day: dayLabel,
      plannedHours: Math.round((stat.planned / 60) * 10) / 10,
      actualHours: Math.round((stat.actual / 60) * 10) / 10,
      plannedMinutes: stat.planned,
      actualMinutes: stat.actual,
    });
  }

  return {
    today: {
      plannedMinutes: plannedMinutesToday,
      actualMinutes: actualMinutesToday,
      remainingMinutes: remainingMinutesToday,
      completedSessions: completedCountToday,
      totalSessions: todaySessions.length,
    },
    weeklyTrend,
  };
}

module.exports = {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  logTimer,
  getStudySummary,
};
