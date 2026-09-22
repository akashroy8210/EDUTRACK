const profileService = require('./profile.service');
const { success } = require('../../utils/responseFormatter');

async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    return success(res, { profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    return success(res, { profile });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
