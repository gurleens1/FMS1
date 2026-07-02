import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/users/me — returns current user's profile + role
// Mirrors: varLoggedInUser, varLoggedInUserRole, varLoggedInUserName
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = await prisma.userRoleModel.findUnique({
      where: { email: req.user!.email },
      include: { employee: true },
    });

    if (!userRole) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: userRole.id,
      email: userRole.email,
      role: userRole.role,
      name: userRole.employee.fullName,
      employeeCode: userRole.employee.employeeCode,
      department: userRole.employee.department,
    });
  } catch (err) {
    throw err;
  }
});

// GET /api/users/assignees — all users with Assignee role (for dropdown)
router.get('/assignees', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const assignees = await prisma.userRoleModel.findMany({
      where: { isActive: true },
      include: { employee: true },
      orderBy: { employee: { fullName: 'asc' } },
    });

    res.json(assignees.map((u) => ({
      id: u.id,
      name: u.employee?.fullName || 'Unknown Employee',
      email: u.email,
      role: u.role,
    })));
  } catch (err) {
    throw err;
  }
});

export default router;