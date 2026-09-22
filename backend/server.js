const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require('mongoose');

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 MyDashboard Backend API running on port ${env.PORT}`);
      console.log(`🌐 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔒 Allowed Origin: ${env.FRONTEND_URL}`);
      console.log(`=========================================`);
    });

    // Graceful Shutdown Handlers (SIGTERM, SIGINT)
    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] ${signal} signal received: closing HTTP server...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await mongoose.connection.close(false);
          console.log('[MongoDB] Database connection closed.');
          process.exit(0);
        } catch (dbErr) {
          console.error('[MongoDB] Error during disconnection:', dbErr.message);
          process.exit(1);
        }
      });

      // Force terminate if graceful shutdown hangs beyond 10 seconds
      setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
