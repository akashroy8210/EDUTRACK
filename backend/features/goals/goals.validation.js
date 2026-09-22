function validateCreateGoal(body) {
  const { title, type } = body;
  const errors = [];
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Goal title is required.');
  }
  const normalizedType = type === 'one-month' ? '1-month' : type;
  if (normalizedType && !['1-month', 'short-term', 'long-term'].includes(normalizedType)) {
    errors.push('Goal type must be 1-month, short-term, or long-term.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

function validateAchievement(body) {
  const { text } = body;
  const errors = [];
  if (!text || typeof text !== 'string' || !text.trim()) {
    errors.push('Achievement log text is required.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateCreateGoal,
  validateAchievement,
};
