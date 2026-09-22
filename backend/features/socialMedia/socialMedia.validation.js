function validatePlatform(body) {
  const { name } = body;
  const errors = [];
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Platform name is required.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

function validateRecord(body) {
  const { platformId, date, minutesSpent } = body;
  const errors = [];
  if (!platformId) errors.push('Platform ID is required.');
  if (!date) errors.push('Date is required (YYYY-MM-DD).');
  if (minutesSpent === undefined || typeof minutesSpent !== 'number' || minutesSpent < 0) {
    errors.push('Minutes spent must be a non-negative number.');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validatePlatform,
  validateRecord,
};
