function validateCreateExam(body) {
  const { subjectName, date } = body;
  const errors = [];
  if (!subjectName || !subjectName.trim()) errors.push('Subject name is required.');
  if (!date) errors.push('Exam date is required.');
  return {
    isValid: errors.length === 0,
    message: errors.join(' '),
    details: errors,
  };
}

module.exports = {
  validateCreateExam,
};
