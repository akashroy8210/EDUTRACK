const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const env = require('../../config/env');
const { ApiError } = require('../../middleware/error.middleware');

function generateToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function sendAuthCookie(res, token) {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookie(res) {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    rollNo: user.rollNo,
    branch: user.branch,
    semester: user.semester,
    section: user.section,
    photo: user.photo,
    isProfileComplete: user.isProfileComplete,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}

async function registerUser({ name, email, password }) {
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    isProfileComplete: false,
  });

  const token = generateToken(newUser._id);
  return {
    user: sanitizeUser(newUser),
    token,
    isNewRegistration: true,
  };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user._id);
  return {
    user: sanitizeUser(user),
    token,
  };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User account not found.', 'USER_NOT_FOUND');
  }
  return sanitizeUser(user);
}

module.exports = {
  generateToken,
  sendAuthCookie,
  clearAuthCookie,
  sanitizeUser,
  registerUser,
  loginUser,
  getCurrentUser,
};
