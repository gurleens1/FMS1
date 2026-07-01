/**
 * userManagement.routes.ts — Full User Management routes (Super Admin only)
 */
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

const ADMIN_ROLES = ['SuperAdmin', 'Admin'];
const SUPER_ONLY  = ['SuperAdmin'];

// 1. GET ALL USERS (Read)
router.get('/', requireRole(...ADMIN_ROLES), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query as Record<string, string>;

    const where: Record<string, any> = {};
    if (role)   where.role = role;
    if (status) where.isActive = status === 'active';
    
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { employee: { fullName: { contains: search } } },
      ];
    }

    const users = await prisma.userRoleModel.findMany({
      where,
      include: { employee: true },
      orderBy: [{ role: 'asc' }, { employee: { fullName: 'asc' } }],
    });

    res.json(users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      employee: {
        id: u.employee.id,
        fullName: u.employee.fullName,
        employeeCode: u.employee.employeeCode,
        department: u.employee.department,
        designation: u.employee.designation,
      },
    })));
  } catch (err) {
    logger.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2. GET SINGLE USER BY ID (Fixes 404 errors if frontend explicitly requests an ID)
router.get('/:id', requireRole(...ADMIN_ROLES), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.userRoleModel.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// 3. POST NEW USER (Create)
router.post('/', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fullName, email, employeeCode, department, designation, role, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = employeeCode.trim();

    // 1. Check if email already exists in UserRoleModel (case-insensitive)
    const existingUser = await prisma.userRoleModel.findFirst({
      where: { email: { equals: normalizedEmail } }
    });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    // 2. Check if employeeCode already exists in Employee table
    const existingEmployeeByCode = await prisma.employee.findUnique({
      where: { employeeCode: normalizedCode }
    });
    if (existingEmployeeByCode && existingEmployeeByCode.email.toLowerCase() !== normalizedEmail) {
      res.status(400).json({ error: `Employee code '${normalizedCode}' is already assigned to another email (${existingEmployeeByCode.email}).` });
      return;
    }

    // Validation 3 removed to allow updating the employeeCode of an existing Employee record when recreating a user

    const defaultPassword = password || 'damco@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create Employee AND User login record together
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.upsert({
        where: { email: normalizedEmail },
        update: { fullName, department, designation, employeeCode: normalizedCode },
        create: {
          email: normalizedEmail,
          fullName,
          employeeCode: normalizedCode,
          department,
          designation,
          joiningDate: new Date()
        }
      });

      const user = await tx.userRoleModel.create({
        data: {
          email: normalizedEmail,
          role,
          password: hashedPassword,
          isActive: true,
          employeeId: employee.id
        }
      });

      return user;
    });

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user. Ensure Employee Code and Email are unique.' });
  }
});

// 4. PATCH UPDATE USER (Update - Changed from PUT to PATCH to match Frontend API)
router.patch('/:id', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { fullName, department, designation, role, isActive, password } = req.body;

    const user = await prisma.userRoleModel.findUnique({ where: { id }, include: { employee: true } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: any = { role, isActive };
    
    // Only update password if a new one is provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update both tables inside a transaction
    await prisma.$transaction([
      prisma.userRoleModel.update({ 
        where: { id }, 
        data: updateData 
      }),
      prisma.employee.update({
        where: { id: user.employeeId },
        data: { fullName, department, designation }
      })
    ]);

    // Send back success response
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 5. DELETE USER
router.delete('/:id', requireRole(...SUPER_ONLY), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.userRoleModel.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Nullify references in FeedbackTicket so we don't hit Foreign Key constraints
    await prisma.feedbackTicket.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null }
    });
    
    await prisma.feedbackTicket.updateMany({
      where: { secondaryAssigneeId: id },
      data: { secondaryAssigneeId: null }
    });

    // Delete ActivityTracker records created by this user to avoid FK violations
    await prisma.activityTracker.deleteMany({
      where: { performedBy: id }
    });

    // Delete the login access (UserRoleModel). 
    // CategoryAssignee records will cascade delete.
    // We intentionally leave the Employee record intact because they might have submitted tickets (ParentTicket).
    await prisma.userRoleModel.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user due to a server error.' });
  }
});

export default router;