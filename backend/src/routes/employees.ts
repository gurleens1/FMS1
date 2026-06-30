import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/employees — list all employees
router.get('/', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { fullName: 'asc' },
    });
    res.json(employees);
  } catch (err) {
    throw err;
  }
});

// GET /api/employees/lookup?email= OR ?code=
// Mirrors Power Fx: LookUp(Employee, EmployeeEmail = DataCardValue30_1.Selected.EmployeeEmail, ...)
// Auto-fills registration form fields
router.get('/lookup', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, code } = req.query as Record<string, string>;

    if (!email && !code) {
      res.status(400).json({ error: 'Provide email or code for lookup' });
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: email
        ? { email: email.toLowerCase() }
        : { employeeCode: code },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json(employee);
  } catch (err) {
    throw err;
  }
});

export default router;
