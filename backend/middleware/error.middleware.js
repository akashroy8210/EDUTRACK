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
  let statusCode = err.statusCode;
  let code = err.code;
  let message = err.message || 'An unexpected error occurred.';

  if (!statusCode) {
    if (err.name === 'ValidationError') {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      code = 'INVALID_ID';
      message = `Invalid ID format for ${err.path}: ${err.value}`;
    } else {
      statusCode = 500;
      code = 'INTERNAL_SERVER_ERROR';
    }
  }

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
