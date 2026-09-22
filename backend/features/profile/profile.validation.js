function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      message: 'Request body must be a valid JSON object.',
    };
  }

  return { isValid: true };
}

module.exports = {
  validateProfileUpdate,
};
