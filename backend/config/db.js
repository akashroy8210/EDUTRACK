const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mydashboard';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected`);
  } catch (err) {
    console.error(`[FATAL] MongoDB connection error: ${err.message}`);
    console.warn(`[MongoDB] Please verify MONGODB_URI is correctly configured in your environment.`);
    process.exit(1);
  }
}

module.exports = connectDB;
