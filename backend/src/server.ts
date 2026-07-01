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
import authRoutes from './routes/auth';
import feedbackRoutes from './routes/feedback';
import employeeRoutes from './routes/employees';
import userRoutes from './routes/users';
import categoryRoutes from './routes/category.routes';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import recordingsRoutes from './routes/recordings';
import insightsRoutes from './routes/insights';
import userMgmtRoutes from './routes/userManagement.routes';
import { startFlagJob } from './jobs/flagJob';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Explicitly allowing credentials and setting methods
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
const auth = authenticateToken;
app.use('/api/feedback', auth, feedbackRoutes);
app.use('/api/employees', auth, employeeRoutes);
app.use('/api/users', auth, userRoutes);
app.use('/api/categories', auth, categoryRoutes);
app.use('/api/dashboard', auth, dashboardRoutes);
app.use('/api/export', auth, exportRoutes);
app.use('/api/recordings', auth, recordingsRoutes);
app.use('/api/insights', auth, insightsRoutes);
app.use('/api/user-management', auth, userMgmtRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await autoSeedCategoriesAndAssignees();
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 FMS Backend running on port ${PORT}`);
      startFlagJob();
    });

    process.on('SIGTERM', () => {
      server.close(() => process.exit(0));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;