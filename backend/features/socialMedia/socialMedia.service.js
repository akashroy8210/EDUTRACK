const SocialPlatform = require('./socialPlatform.model');
const SocialRecord = require('./socialRecord.model');
const { getTodayDate, addDays } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

async function getPlatforms(userId) {
  let platforms = await SocialPlatform.find({ userId });
  if (platforms.length === 0) {
    const defaults = [
      { name: 'Instagram', color: '#e1306c', icon: 'InstagramLogo' },
      { name: 'YouTube', color: '#ef4444', icon: 'YoutubeLogo' },
      { name: 'Twitter / X', color: '#38bdf8', icon: 'TwitterLogo' },
      { name: 'LinkedIn', color: '#0a66c2', icon: 'LinkedinLogo' },
    ];
    await SocialPlatform.insertMany(defaults.map(d => ({ ...d, userId })));
    platforms = await SocialPlatform.find({ userId });
  }
  return platforms;
}

async function createPlatform(userId, { name, color, icon }) {
  const existing = await SocialPlatform.findOne({ userId, name: name.trim() });
  if (existing) {
    return existing;
  }
  return await SocialPlatform.create({
    userId,
    name: name.trim(),
    color: color || '#e1306c',
    icon: icon || 'Globe',
  });
}

async function getRecords(userId, startDate, endDate) {
  const query = { userId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  return await SocialRecord.find(query).populate('platformId', 'name color icon').sort({ date: 1 });
}

async function logUsage(userId, { platformId, date, minutesSpent }) {
  const today = getTodayDate();
  const targetDate = date || today;

  if (targetDate > today) {
    throw new ApiError(400, 'Cannot log social media usage for future dates.', 'FUTURE_DATE_NOT_ALLOWED');
  }

  // Verify platform belongs to user
  const platform = await SocialPlatform.findOne({ _id: platformId, userId });
  if (!platform) {
    throw new ApiError(404, 'Social media platform not found.', 'NOT_FOUND');
  }

  // 1. Enforce historical immutability: past records cannot be edited once recorded
  const existingRecord = await SocialRecord.findOne({ userId, platformId, date: targetDate });
  if (existingRecord) {
    throw new ApiError(
      409,
      `A usage record for ${platform.name} on ${targetDate} is already logged and cannot be edited.`,
      'RECORD_IMMUTABLE'
    );
  }

  // 2. Enforce sequential days: must not skip dates
  const latestRecord = await SocialRecord.findOne({ userId, platformId }).sort({ date: -1 });
  if (latestRecord) {
    const expectedNextDate = addDays(latestRecord.date, 1);
    if (targetDate < expectedNextDate) {
      throw new ApiError(
        400,
        `Cannot insert historical records out of chronological sequence. Expected date: ${expectedNextDate}.`,
        'DATE_OUT_OF_ORDER'
      );
    }
    if (targetDate > expectedNextDate) {
      throw new ApiError(
        400,
        `Sequential day entry required. You must enter ${expectedNextDate} before entering ${targetDate}.`,
        'DATE_SEQUENCE_GAP'
      );
    }
  }

  return await SocialRecord.create({
    userId,
    platformId,
    date: targetDate,
    minutesSpent: Math.max(0, Number(minutesSpent) || 0),
  });
}

async function getWeeklyUsageGraph(userId) {
  const today = getTodayDate();
  const startDate = addDays(today, -6);

  const records = await SocialRecord.find({
    userId,
    date: { $gte: startDate, $lte: today },
  }).populate('platformId', 'name color');

  return records;
}

module.exports = {
  getPlatforms,
  createPlatform,
  getRecords,
  logUsage,
  getWeeklyUsageGraph,
};
