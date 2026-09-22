const DailyWork = require('./dailyWork.model');
const { getTodayDate, addDays } = require('../../utils/dateUtils');
const { ApiError } = require('../../middleware/error.middleware');

const PRIORITY_RANKS = {
  high: 1,
  medium: 2,
  low: 3,
};

async function carryForwardTasks(userId, today) {
  // Find incomplete daily tasks from earlier dates
  const overdueTasks = await DailyWork.find({
    userId,
    type: 'daily',
    completed: false,
    date: { $lt: today },
  });

  for (const task of overdueTasks) {
    task.carriedFromDate = task.carriedFromDate || task.date;
    task.date = today;
    await task.save();
  }
}

async function getDailyWorks(userId, filter) {
  const today = getTodayDate();
  await carryForwardTasks(userId, today);

  const query = { userId };
  if (filter === 'daily') {
    query.type = 'daily';
  } else if (filter === 'permanent') {
    query.type = 'permanent';
  } else if (filter === 'high') {
    query.priority = 'high';
  }

  const tasks = await DailyWork.find(query);

  // Strictly sort pending tasks: high -> medium -> low, followed by date
  return tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const rankA = PRIORITY_RANKS[a.priority] || 2;
    const rankB = PRIORITY_RANKS[b.priority] || 2;
    return rankA - rankB;
  });
}

async function createDailyWork(userId, { title, priority, type }) {
  const today = getTodayDate();
  return await DailyWork.create({
    userId,
    title: title.trim(),
    priority: priority || 'medium',
    type: type || 'daily',
    date: today,
    completed: false,
  });
}

async function toggleDailyWork(userId, id, forceConfirmLowerPriority = false) {
  const task = await DailyWork.findOne({ _id: id, userId });
  if (!task) {
    throw new ApiError(404, 'Task not found.', 'NOT_FOUND');
  }

  const willBeCompleted = !task.completed;
  const today = getTodayDate();

  // Enforce priority rule: a lower-priority task cannot be completed before higher-priority tasks without explicit confirmation
  if (willBeCompleted && !forceConfirmLowerPriority) {
    const rank = PRIORITY_RANKS[task.priority] || 2;
    const higherPriorities = Object.keys(PRIORITY_RANKS).filter(p => PRIORITY_RANKS[p] < rank);
    if (higherPriorities.length > 0) {
      const higherPending = await DailyWork.findOne({
        userId,
        completed: false,
        priority: { $in: higherPriorities },
      });
      if (higherPending) {
        throw new ApiError(
          400,
          `Higher-priority task "${higherPending.title}" (${higherPending.priority}) is still pending. Explicit confirmation required to complete lower-priority task first.`,
          'HIGHER_PRIORITY_PENDING'
        );
      }
    }
  }

  if (willBeCompleted) {
    task.completed = true;
    task.completedAt = today;
  } else {
    task.completed = false;
    task.completedAt = null;
  }

  await task.save();
  return task;
}

async function updatePriority(userId, id, nextPriority) {
  const task = await DailyWork.findOne({ _id: id, userId });
  if (!task) {
    throw new ApiError(404, 'Task not found.', 'NOT_FOUND');
  }
  task.priority = nextPriority;
  await task.save();
  return task;
}

async function updateDailyWork(userId, id, { title, priority, type }) {
  const task = await DailyWork.findOne({ _id: id, userId });
  if (!task) {
    throw new ApiError(404, 'Task not found.', 'NOT_FOUND');
  }

  if (title !== undefined && typeof title === 'string' && title.trim()) {
    task.title = title.trim();
  }
  if (priority !== undefined && ['high', 'medium', 'low'].includes(priority)) {
    task.priority = priority;
  }
  if (type !== undefined && ['daily', 'permanent'].includes(type)) {
    task.type = type;
  }

  await task.save();
  return task;
}

async function deleteDailyWork(userId, id) {
  const deleted = await DailyWork.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    throw new ApiError(404, 'Task not found.', 'NOT_FOUND');
  }
  return deleted;
}

async function resetDailyWorks(userId) {
  const today = getTodayDate();
  await DailyWork.updateMany(
    { userId, type: 'daily', date: today },
    { completed: false, completedAt: null }
  );
  return { message: 'All daily tasks reset for today.' };
}

async function getProductivityChart(userId) {
  const today = getTodayDate();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const dateObj = new Date(d);
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const completedCount = await DailyWork.countDocuments({
      userId,
      completed: true,
      completedAt: d,
    });

    const totalCount = await DailyWork.countDocuments({
      userId,
      type: 'daily',
    });

    const safeTotal = Math.max(totalCount, 1);
    const pct = Math.round((completedCount / safeTotal) * 100);

    days.push({
      day: dayLabel,
      date: d,
      done: completedCount,
      pct,
    });
  }

  return days;
}

module.exports = {
  getDailyWorks,
  createDailyWork,
  toggleDailyWork,
  updatePriority,
  updateDailyWork,
  deleteDailyWork,
  resetDailyWorks,
  getProductivityChart,
};
