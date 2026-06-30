/**
 * server.ts — FMS Backend Entry Point
 * UPDATED: Added graceful startup to prevent database locking and port hanging.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { autoSeedCategoriesAndAssignees } from './utils/autoSeed';

// Auth routes
import authRoutes from './routes/auth';

// Protected routes
import feedbackRoutes      from './routes/feedback';
import employeeRoutes      from './routes/employees';
import userRoutes          from './routes/users';
import categoryRoutes      from './routes/category.routes'; // NEW: Category management routes
import dashboardRoutes     from './routes/dashboard';
import exportRoutes        from './routes/export';
import recordingsRoutes    from './routes/recordings';
import insightsRoutes      from './routes/insights';

import { startFlagJob } from './jobs/flagJob';

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

// ── Security & Utilities ──
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──
app.get('/health', (_req, res) => {
  logger.info('Health check pinged');
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

const auth = authenticateToken;
app.use('/api/feedback',        auth, feedbackRoutes);
app.use('/api/employees',       auth, employeeRoutes);
app.use('/api/users',           auth, userRoutes);
app.use('/api/categories', auth, categoryRoutes); // NEW: Mounted Category routes
app.use('/api/dashboard',       auth, dashboardRoutes);
app.use('/api/export',          auth, exportRoutes);
app.use('/api/recordings',      auth, recordingsRoutes);
app.use('/api/insights',        auth, insightsRoutes);

app.use(errorHandler);

// ── GRACEFUL STARTUP ──
// Prevents the "works once then fails" issue by ensuring clean binding
const startServer = async () => {
  try {
    // Run automated Category/Assignee initialization on server start
    await autoSeedCategoriesAndAssignees();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 FMS Backend running on http://localhost:${PORT}`);
      startFlagJob();
    });

    // Handle process termination to release DB/Port
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Closing server...');
      server.close(() => process.exit(0));
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Trigger autoSeed on startup
export default app;