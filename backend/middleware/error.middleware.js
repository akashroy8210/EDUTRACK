class ApiError extends Error {
  constructor(statusCode, message, code = 'API_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const code = err.code || (err.name === 'ValidationError' ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred.';

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
    },
  };

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  ApiError,
  errorMiddleware,
};
