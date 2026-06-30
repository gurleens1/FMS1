import { Router } from 'express';
import authRoutes from './auth';
import feedbackRoutes from './feedback';
import dashboardRoutes from './dashboard';
import employeeRoutes from './employees';
import userRoutes from './users';
import insightsRoutes from './insights';

// FIXED: Added the exact '.routes' suffix to match your file
import userMgmtRoutes from './userManagement.routes'; 

// Import your new export route
import exportRoutes from './export'; 

const router = Router();

router.use('/auth', authRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/employees', employeeRoutes);
router.use('/users', userRoutes);
router.use('/insights', insightsRoutes);
router.use('/user-management', userMgmtRoutes);

// Register the export endpoint
router.use('/export', exportRoutes);

export default router;