const Goal = require('./goal.model');
const { getTodayDate } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

async function getGoals(userId, type) {
  const query = { userId };
  if (type) query.type = type;
  return await Goal.find(query).sort({ deadline: 1 });
}

async function createGoal(userId, { title, description, type, deadline, targetDate, progress }) {
  const finalDeadline = deadline || targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const finalType = type === 'one-month' ? '1-month' : (type || 'short-term');
  const validProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  return await Goal.create({
    userId,
    title: title.trim(),
    description: description || '',
    type: finalType,
    deadline: finalDeadline,
    status: 'active',
    progress: validProgress,
    achievements: [],
  });
}

async function updateGoal(userId, id, updateData) {
  const goal = await Goal.findOne({ _id: id, userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found.', 'NOT_FOUND');
  }

  if (updateData.type === 'one-month') updateData.type = '1-month';
  const fields = ['title', 'description', 'type', 'deadline', 'status', 'progress'];
  fields.forEach(f => {
    if (updateData[f] !== undefined) {
      if (f === 'progress') {
        goal.progress = Math.min(100, Math.max(0, Number(updateData.progress) || 0));
      } else {
        goal[f] = updateData[f];
      }
    }
  });

  await goal.save();
  return goal;
}

async function addAchievement(userId, goalId, { text, date }) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found.', 'NOT_FOUND');
  }

  goal.achievements.push({
    text: text.trim(),
    date: date || getTodayDate(),
  });

  await goal.save();
  return goal;
}

async function deleteAchievement(userId, goalId, achievementId) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found.', 'NOT_FOUND');
  }

  goal.achievements = goal.achievements.filter(
    a => a._id?.toString() !== achievementId && a.id !== achievementId
  );

  await goal.save();
  return goal;
}

async function deleteGoal(userId, id) {
  const deleted = await Goal.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Goal not found.', 'NOT_FOUND');
  }
  return deleted;
}

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  addAchievement,
  deleteAchievement,
  deleteGoal,
};
