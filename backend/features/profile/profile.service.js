const User = require('../auth/auth.model');
const { sanitizeUser } = require('../auth/auth.service');
const { ApiError } = require('../../middleware/error.middleware');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }
  return sanitizeUser(user);
}

async function updateProfile(userId, updateData) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.', 'NOT_FOUND');
  }

  // Verify email uniqueness if email is being modified
  if (updateData.email && typeof updateData.email === 'string') {
    const normalizedEmail = updateData.email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
      }
      user.email = normalizedEmail;
    }
  }

  const fields = ['name', 'rollNo', 'branch', 'semester', 'section', 'photo', 'timezone'];
  fields.forEach(field => {
    if (updateData[field] !== undefined) {
      user[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
    }
  });

  // Calculate profile completeness
  user.isProfileComplete = Boolean(
    user.name &&
    user.email &&
    user.rollNo &&
    user.branch &&
    user.semester &&
    user.section
  );

  await user.save();
  return sanitizeUser(user);
}

module.exports = {
  getProfile,
  updateProfile,
};
