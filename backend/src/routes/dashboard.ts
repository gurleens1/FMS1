import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

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

// ── 1. GET /api/dashboard/summary ──
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, userId } = req.user!;
    const isAdmin = role === 'SuperAdmin' || role === 'Admin';
    
    const baseWhere: any = {
      status: { not: 'Deleted' },
    };
    if (!isAdmin) {
      baseWhere.OR = [
        { assigneeId: userId },
        { secondaryAssigneeId: userId }
      ];
    }

    const [total, resolved, late, isNew, urgent] = await Promise.all([
      prisma.feedbackTicket.count({ where: baseWhere }),
      prisma.feedbackTicket.count({ 
        where: { ...baseWhere, status: { in: ['Resolved', 'Closed'] } } 
      }),
      prisma.feedbackTicket.count({ 
        where: { ...baseWhere, flag: 'LateInput' } 
      }),
      prisma.feedbackTicket.count({ 
        where: { ...baseWhere, status: 'Open' } 
      }),
      prisma.feedbackTicket.count({ 
        where: { 
          ...baseWhere, 
          priority: 'High', 
          status: { notIn: ['Resolved', 'Closed', 'Deleted'] } 
        } 
      }),
    ]);

    res.json({ total, resolved, late, new: isNew, urgent });
  } catch (err) {
    console.error("Dashboard Summary Error:", err);
    res.status(500).json({ error: 'Dashboard summary failed' });
  }
});

// ── 2. GET /api/dashboard/employees ──
router.get('/employees', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, userId } = req.user!;
    const isAdmin = role === 'SuperAdmin' || role === 'Admin';
    const { tab = 'PulseCheck', page = '1', limit = '20', status, priority, nature } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const sourceFilter = buildSourceFilter(tab);

    const where: any = {
      feedbackSource: sourceFilter,
      status: { not: 'Deleted' },
      ...(priority ? { priority: { in: priority.split(',') } } : {}),
      ...(nature ? { nature: { in: nature.split(',') } } : {}),
    };

    if (status) {
      where.status = { in: status.split(',') };
    }
    if (!isAdmin) {
      where.OR = [
        { assigneeId: userId },
        { secondaryAssigneeId: userId }
      ];
    }

    const tickets = await prisma.feedbackTicket.findMany({
      where,
      include: { 
        parentTicket: { include: { employee: true } },
        // FIXED: Explicitly grab the employee profile connected to the Assignee to get the real Name!
        assignee: {
          include: { employee: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const grouped: Record<number, any> = {};
    tickets.forEach((t: any) => {
      const empId = t.parentTicket.employeeId;
      
      let displaySource = t.feedbackSource || "";
      const normalizedSource = displaySource.replace(/\s+/g, '');
      if (normalizedSource === 'OthersManagers') {
        displaySource = 'Managers';
      } else if (normalizedSource === 'OthersHelpdesks') {
        displaySource = 'Helpdesks';
      } else if (displaySource.startsWith("Others") && displaySource !== "Others") {
        displaySource = displaySource.substring(6).replace(/[()]/g, '').trim();
      } else if (displaySource === "PulseCheck") {
        displaySource = "Pulse Check";
      } else if (displaySource === "ExitInterview") {
        displaySource = "Exit Interview";
      } else if (displaySource === "VoiceBox") {
        displaySource = "Voice Box";
      }

      if (!grouped[empId]) {
        grouped[empId] = {
          parentId: t.parentTicket.id,
          employee: {
            id: t.parentTicket.employee.id,
            name: t.empFullName || t.parentTicket.employee.fullName,
            code: t.empCode || t.parentTicket.employee.employeeCode,
            department: t.empDepartment || t.parentTicket.employee.department,
            email: t.empEmail || t.parentTicket.employee.email,
          },
          feedbackSource: displaySource,
          totalFeedback: 0,
          actionPending: 0,
          highPriorityPending: 0,
          oldestPendingDays: 0, 
          lastFeedbackDate: t.createdAt,
          children: []
        };
      }

      const row = grouped[empId];
      row.totalFeedback++;
      
      let daysDiff = 0;
      if (!['Resolved', 'Closed', 'Deleted'].includes(t.status)) {
        row.actionPending++;
        if (t.priority === 'High') row.highPriorityPending++;

        const ticketDate = t.feedbackRegistrationDate ? new Date(t.feedbackRegistrationDate) : new Date(t.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        ticketDate.setHours(0, 0, 0, 0);
        
        const timeDiff = today.getTime() - ticketDate.getTime();
        daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        
        if (daysDiff > row.oldestPendingDays) {
          row.oldestPendingDays = daysDiff;
        }
      }

      let dynamicFlag = null;
      if (!['Resolved', 'Closed', 'Deleted'].includes(t.status)) {
        if (daysDiff >= 6) {
          dynamicFlag = 'LateInput';
        } else if (daysDiff >= 3) {
          dynamicFlag = 'Warning'; 
        }
      }
      
      row.children.push({
        id: t.id,
        feedbackId: `FB-${String(t.id).padStart(4, '0')}`,
        category: t.category,
        priority: t.priority,
        status: t.status,
        statusDisplay: t.status === 'Open' ? 'new' : t.status.toLowerCase(),
        notes: t.notes,
        createdAt: t.createdAt,
        // FIXED: Maps the deeply nested employee name from the Prisma query
        assigneeName: t.assignee?.employee?.fullName || t.assignee?.name || 'Unassigned',
        agingDays: daysDiff,
        flag: dynamicFlag || t.flag 
      });
    });

    const finalData = Object.values(grouped);

    res.json({
      data: finalData.slice(skip, skip + take),
      pagination: {
        total: finalData.length,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(finalData.length / take)
      }
    });
  } catch (err) {
    console.error("Dashboard Employees Error:", err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;