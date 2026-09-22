const CommonWork = require('./commonWork.model');
const CommonRecord = require('./commonRecord.model');
const { getTodayDate, addDays } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

async function calculateStreak(userId, workId) {
  const records = await CommonRecord.find({ userId, workId, completed: true }).sort({ date: -1 });
  if (!records.length) return 0;

  const dates = new Set(records.map(r => r.date));
  let streak = 0;
  let curr = getTodayDate();

  if (!dates.has(curr)) {
    curr = addDays(curr, -1);
    if (!dates.has(curr)) return 0;
  }

  while (dates.has(curr)) {
    streak++;
    curr = addDays(curr, -1);
  }

  return streak;
}

async function getCommonWorks(userId) {
  const works = await CommonWork.find({ userId });
  const today = getTodayDate();

  const startDate = addDays(today, -13);
  const records = await CommonRecord.find({
    userId,
    date: { $gte: startDate, $lte: today },
  });

  return await Promise.all(
    works.map(async w => {
      const streak = await calculateStreak(userId, w._id);
      const wRecords = records.filter(r => r.workId.toString() === w._id.toString());
      const doneToday = wRecords.some(r => r.date === today && r.completed);

      const completionHistory = {};
      wRecords.forEach(r => {
        completionHistory[r.date] = r.completed;
      });

      const elapsedMs = Date.now() - new Date(w.lastEditedAt || w.createdAt).getTime();
      const cooldownMs = 7 * 24 * 60 * 60 * 1000;
      const isEditable = elapsedMs >= cooldownMs;
      const daysRemainingForEdit = isEditable ? 0 : Math.ceil((cooldownMs - elapsedMs) / (24 * 60 * 60 * 1000));

      return {
        id: w._id,
        text: w.title,
        icon: w.icon,
        color: w.color,
        streak,
        doneToday,
        isEditable,
        daysRemainingForEdit,
        completionHistory,
        lastEditedAt: w.lastEditedAt,
      };
    })
  );
}

async function createCommonWork(userId, { title, icon, color }) {
  const now = new Date();
  return await CommonWork.create({
    userId,
    title: title.trim(),
    icon: icon || 'Sparkle',
    color: color || '#6366f1',
    lastEditedAt: now,
  });
}

async function updateCommonWork(userId, id, { title, icon, color }) {
  const work = await CommonWork.findOne({ _id: id, userId });
  if (!work) {
    throw new ApiError(404, 'Common work habit not found.', 'NOT_FOUND');
  }

  // Enforce 7-day edit cooldown from creation or previous edit
  const elapsedMs = Date.now() - new Date(work.lastEditedAt || work.createdAt).getTime();
  const cooldownMs = 7 * 24 * 60 * 60 * 1000;
  if (elapsedMs < cooldownMs) {
    const daysRemaining = Math.ceil((cooldownMs - elapsedMs) / (24 * 60 * 60 * 1000));
    throw new ApiError(
      403,
      `Common Work can only be edited once every 7 days. Next edit available in ${daysRemaining} day(s).`,
      'EDIT_COOLDOWN_ACTIVE'
    );
  }

  if (title) work.title = title.trim();
  if (icon) work.icon = icon;
  if (color) work.color = color;
  work.lastEditedAt = new Date();

  await work.save();
  return work;
}

async function deleteCommonWork(userId, id) {
  const deleted = await CommonWork.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Common work habit not found.', 'NOT_FOUND');
  }
  await CommonRecord.deleteMany({ userId, workId: id });
  return deleted;
}

async function toggleCommonWork(userId, workId, date) {
  const targetDate = date || getTodayDate();

  // Verify CommonWork belongs to this user (prevent IDOR)
  const work = await CommonWork.findOne({ _id: workId, userId });
  if (!work) {
    throw new ApiError(404, 'Common work habit not found.', 'NOT_FOUND');
  }

  const existing = await CommonRecord.findOne({ userId, workId, date: targetDate });
  const nextStatus = existing ? !existing.completed : true;

  const record = await CommonRecord.findOneAndUpdate(
    { userId, workId, date: targetDate },
    { completed: nextStatus },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const newStreak = await calculateStreak(userId, workId);
  return { record, streak: newStreak };
}

module.exports = {
  getCommonWorks,
  createCommonWork,
  updateCommonWork,
  deleteCommonWork,
  toggleCommonWork,
};
