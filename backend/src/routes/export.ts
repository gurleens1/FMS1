import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { createObjectCsvStringifier } from 'csv-writer';

const router = Router();

// Helper to reliably build the source filter logic for the Export
const buildSourceFilter = (tab: string) => {
  const mainTabs = ['PulseCheck', 'ExitInterview', 'VoiceBox'];
  if (tab === 'Others' || !tab) {
    return { notIn: mainTabs };
  } else if (!mainTabs.includes(tab)) {
    return { contains: tab.trim() };
  } else {
    return tab;
  }
};

/**
 * GET /api/export/csv
 * Exports feedback data as CSV.
 * Mirrors the Power Automate "Export to Excel" flow.
 */
router.get('/csv', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, userId } = req.user!;
    const isAdmin = role === 'SuperAdmin' || role === 'Admin';

    // Grab the exact same filters sent from the dashboard and feedback list
    const { 
      tab, search, status, priority, nature, source, category, assigneeId, dateFrom, dateTo, flag 
    } = req.query as Record<string, string>;

    const where: any = {
      status: { not: 'Deleted' },
      AND: []
    };

    if (tab) {
      where.feedbackSource = buildSourceFilter(tab);
    }
    
    if (status) {
      where.status = { 
        in: status.split(',').map(s => {
          if (s === 'New') return 'Open';
          if (s === 'In Progress') return 'InProgress';
          return s;
        }) 
      };
    }
    if (priority) where.priority = { in: priority.split(',') };
    if (nature) where.nature = { in: nature.split(',') };
    if (source) where.feedbackSource = source; 
    if (category) where.category = category;
    if (assigneeId) where.assigneeId = Number(assigneeId);
    if (flag) where.flag = flag;

    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) dateFilter.lte = new Date(`${dateTo}T23:59:59.999Z`);
      where.createdAt = dateFilter;
    }

    if (search) {
      where.AND.push({
        OR: [
          { empFullName: { contains: search } },
          { empEmail: { contains: search } },
          { category: { contains: search } },
          { feedbackSource: { contains: search } }
        ]
      });
    }

    if (!isAdmin) {
      where.AND.push({
        OR: [
          { assigneeId: Number(userId) },
          { secondaryAssigneeId: Number(userId) }
        ]
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const tickets = await prisma.feedbackTicket.findMany({
      where,
      include: {
        parentTicket: { include: { employee: true } },
        assignee: { include: { employee: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'assignmentNumber', title: 'Assignment Number' },
        { id: 'empFullName', title: 'Employee Name' },
        { id: 'empEmail', title: 'Employee Email' },
        { id: 'empCode', title: 'Employee Code' },
        { id: 'empDepartment', title: 'Department' },
        { id: 'empDesignation', title: 'Designation' },
        { id: 'feedbackSource', title: 'Feedback Source' },
        { id: 'category', title: 'Category' },
        { id: 'status', title: 'Status' },
        { id: 'priority', title: 'Priority' },
        { id: 'nature', title: 'Nature' },
        { id: 'assignee', title: 'Assignee' },
        { id: 'flag', title: 'Flag' },
        { id: 'isAnonymous', title: 'Is Anonymous' },
        { id: 'feedbackRegistrationDate', title: 'Feedback Registration Date' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'resolvedOn', title: 'Resolved On' },
        { id: 'notes', title: 'Notes' },
      ],
    });

    const records = tickets.map((t: any) => {
      // Safely extract deeply nested relationships
      const emp = t.parentTicket?.employee || {};
      const assigneeName = t.assignee?.employee?.fullName || t.assignee?.name || t.assigneeName || t.primaryAssignee || 'Unassigned';
      
      // FIXED: Fallback logic for Registration Date. If null, use createdAt.
      const regDate = t.feedbackRegistrationDate 
        ? t.feedbackRegistrationDate.toISOString().split('T')[0] 
        : t.createdAt.toISOString().split('T')[0];
        
      return {
        id: `FB-${String(t.id).padStart(4, '0')}`,
        assignmentNumber: t.assignmentNumber || '',
        empFullName: emp.fullName || t.empFullName || '',
        empEmail: emp.email || t.empEmail || '',
        empCode: emp.employeeCode || t.empCode || '',
        empDepartment: emp.department || t.empDepartment || '',
        empDesignation: emp.designation || t.empDesignation || '',
        feedbackSource: t.feedbackSource || '',
        category: t.category || '',
        status: t.status === 'Open' ? 'New' : t.status,
        priority: t.priority || '',
        nature: t.nature || '',
        assignee: assigneeName,
        flag: t.flag || '',
        isAnonymous: t.isAnonymous ? 'Yes' : 'No',
        feedbackRegistrationDate: regDate, // Safely assigned fallback here
        createdAt: t.createdAt.toISOString().split('T')[0],
        resolvedOn: t.resolvedOn ? t.resolvedOn.toISOString().split('T')[0] : '',
        notes: t.notes || '',
      };
    });

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    const filename = `FMS_Export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;