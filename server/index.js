import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, getDb } from './db/database.js';

import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize database first (async for sql.js WASM loading)
  await initializeDatabase();
  console.log('Database initialized.');

  const app = express();
  const PORT = process.env.PORT || 5000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }));

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Lazy import routes after DB is initialized
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: pdfsRoutes } = await import('./routes/pdfs.js');
  const { default: questionsRoutes } = await import('./routes/questions.js');
  const { default: testsRoutes } = await import('./routes/tests.js');
  const { default: analyticsRoutes } = await import('./routes/analytics.js');
  const { default: dashboardRoutes } = await import('./routes/dashboard.js');
  const { default: activityRoutes } = await import('./routes/activity.js');
  const { default: chatRoutes } = await import('./routes/chat.js');
  const { default: adminRoutes } = await import('./routes/admin.js');
  const { default: targetRoutes } = await import('./routes/targets.js');

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/pdfs', pdfsRoutes);
  app.use('/api/questions', questionsRoutes);
  app.use('/api/tests', testsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/targets', targetRoutes);

  // Auto-seed default accounts if database is new
  try {
    const checkUser = getDb().prepare('SELECT COUNT(*) as count FROM users').get();
    if (!checkUser || checkUser.count === 0) {
      console.log('Fresh database detected. Seeding default accounts & demo questions...');
      const { default: seed } = await import('./db/seed.js');
      // seed script runs automatically when executed or can be imported
    }
  } catch (e) {
    // continue
  }

  // Production setup - serve client build
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.resolve(__dirname, '../client/dist');
    app.use(express.static(clientDist));
    
    // Changed '*' to '/*splat' for Express 5 / path-to-regexp compatibility
    app.get('/*splat', (req, res) => {
      res.sendFile(path.resolve(clientDist, 'index.html'));
    });
  }

  // Global error handler
  app.use(errorHandler);

  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`StudyBuddy server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});