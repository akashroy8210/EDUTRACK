/**
 * Standardized Response Formatter for MyDashboard API
 */

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function created(res, data) {
  return success(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

module.exports = {
  success,
  created,
  noContent,
};
