import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import axios from 'axios';
import https from 'https';

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

// GET /api/employees/external-lookup?query=...
router.get('/external-lookup', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query as Record<string, string>;
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Provide at least 2 characters for search' });
      return;
    }
    const q = query.toLowerCase();

    // Set up https agent to bypass self-signed cert on .local if needed
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const apiUrl = 'https://damco-dev.damco.local:9001/api/ExternalFeedbackManagement/GetActiveEmployees';
    const apiKey = process.env.EXTERNAL_API_KEY || 'Yg6m3L2Y1r4S8jv7M9fQkPpN0WbXcE5nUuA2zHtR6dCsVxJ8iG';

    const response = await axios.get(apiUrl, {
      headers: { 'X-Api-Key': apiKey },
      httpsAgent
    });

    let employees: any[] = [];
    if (Array.isArray(response.data)) {
      employees = response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      employees = response.data.data;
    } else if (response.data && Array.isArray(response.data.employees)) {
      employees = response.data.employees;
    } else {
      console.error('Unexpected data type from external API:', typeof response.data, response.data);
      res.status(500).json({ error: 'Unexpected API response format' });
      return;
    }
    
    // Filter locally by name or email
    const filtered = employees.filter(e => 
      (e.fullName && e.fullName.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q))
    );

    res.json(filtered);
  } catch (err: any) {
    console.error('External API error:', err?.message || err);
    if (err.response) {
       console.error('External API status:', err.response.status);
       console.error('External API data:', err.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch from external API. Check backend logs for details.' });
  }
});

export default router;
