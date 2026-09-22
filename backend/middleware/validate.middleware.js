const { ApiError } = require('./error.middleware');

function validateMiddleware(schema) {
  return (req, res, next) => {
    if (!schema) return next();
    const result = schema(req.body, req.params, req.query);
    if (result && !result.isValid) {
      return next(new ApiError(400, result.message || 'Validation failed', 'VALIDATION_ERROR', result.details || []));
    }
    next();
  };
}

module.exports = {
  validateMiddleware,
};
