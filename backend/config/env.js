require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && nodeEnv === 'production') {
  console.error('[FATAL] JWT_SECRET environment variable must be defined in production.');
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mydashboard',
  JWT_SECRET: jwtSecret || 'dev_only_ephemeral_jwt_secret_not_for_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: nodeEnv,
};
