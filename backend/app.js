const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { errorMiddleware } = require('./middleware/error.middleware');

// Feature Routers
const authRoutes = require('./features/auth/auth.routes');
const profileRoutes = require('./features/profile/profile.routes');
const academicsRoutes = require('./features/academics/academics.routes');
const commonWorksRoutes = require('./features/commonWorks/commonWorks.routes');
const socialMediaRoutes = require('./features/socialMedia/socialMedia.routes');
const dailyWorksRoutes = require('./features/dailyWorks/dailyWorks.routes');
const goalsRoutes = require('./features/goals/goals.routes');
const blogRoutes = require('./features/blog/blog.routes');
const examsRoutes = require('./features/exams/exams.routes');
const dashboardRoutes = require('./features/dashboard/dashboard.routes');
const codeforcesRoutes = require('./features/codeforces/codeforces.routes');

const app = express();

// Security & Parsing Middleware
app.use(helmet());

const allowedOrigins = [
  env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/+$/, '') : null,
  'http://localhost:5173',
  'http://localhost:8443',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8443',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or non-browser tools (e.g. Postman, curl)
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'MyDashboard Backend API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/common-works', commonWorksRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/daily-works', dailyWorksRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/codeforces', codeforcesRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
