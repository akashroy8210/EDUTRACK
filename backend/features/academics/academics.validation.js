function validateSubject(body) {
  const { code, name } = body;
  const errors = [];
  if (!code || !code.trim()) errors.push('Subject code is required.');
  if (!name || !name.trim()) errors.push('Subject name is required.');
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

function validateClassSession(body) {
  const { subjectId, day, time } = body;
  const errors = [];
  if (!subjectId) errors.push('Subject ID is required.');
  if (!day) errors.push('Day of the week is required.');
  if (!time) errors.push('Time interval string is required (e.g. 09:00 - 10:00).');
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

function validateAttendanceMark(body) {
  const { subjectId, date, status } = body;
  const errors = [];
  if (!subjectId) errors.push('Subject ID is required.');
  if (!date) errors.push('Date is required.');
  if (!status || !['present', 'absent'].includes(status)) {
    errors.push('Status must be either "present" or "absent".');
  }
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateSubject,
  validateClassSession,
  validateAttendanceMark,
};
