function validateCreateCommonWork(body) {
  const { title } = body;
  const errors = [];
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Common work title is required.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateCreateCommonWork,
};
