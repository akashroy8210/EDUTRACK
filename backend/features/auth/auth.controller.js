const authService = require('./auth.service');
const { success, created } = require('../../utils/responseFormatter');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerUser({ name, email, password });
    authService.sendAuthCookie(res, result.token);
    return created(res, result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    authService.sendAuthCookie(res, result.token);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    authService.clearAuthCookie(res);
    return success(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
