const mongoose = require('mongoose');

const socialPlatformSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Platform name is required'],
      trim: true,
    },
    color: {
      type: String,
      default: '#e1306c',
    },
    icon: {
      type: String,
      default: 'Globe',
    },
  },
  { timestamps: true }
);

socialPlatformSchema.index({ userId: 1, name: 1 }, { unique: true });

const SocialPlatform = mongoose.model('SocialPlatform', socialPlatformSchema);

module.exports = SocialPlatform;
