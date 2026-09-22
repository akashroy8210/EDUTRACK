function validateCreateDailyWork(body) {
  const { title, priority } = body;
  const errors = [];
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Task title is required.');
  }
  if (priority && !['high', 'medium', 'low'].includes(priority)) {
    errors.push('Priority must be high, medium, or low.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateCreateDailyWork,
};
