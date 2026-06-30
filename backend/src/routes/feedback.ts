import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/feedback (Register Feedback)
// ─────────────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      notes, category, nature, priority, isAnonymous, isConfidential, feedbackSource,
      feedbackRegistrationDate,
      empFullName, empEmail, empCode, empDepartment, empDesignation,
      assigneeId, secondaryAssigneeId, title, description, empJoiningDate,
      attachment 
    } = req.body;

    const lastTicket = await prisma.feedbackTicket.findFirst({
      orderBy: { assignmentNumber: 'desc' },
      select: { assignmentNumber: true }
    });
    const nextAssignmentNumber = (lastTicket?.assignmentNumber || 0) + 1;

    let finalName = empFullName || req.user?.name;
    let finalCode = empCode;
    let finalEmail = empEmail || req.user?.email;

    if (isAnonymous) {
      const anonCount = await prisma.feedbackTicket.count({ where: { isAnonymous: true } });
      finalName = `ANON-${anonCount + 1}`;
      finalCode = `ANON-${anonCount + 1}`;
      finalEmail = `anon-${anonCount + 1}@fms.com`;
    }

    let finalJoiningDate: Date | null = null;
    if (empJoiningDate) {
      const parsed = new Date(empJoiningDate);
      if (!isNaN(parsed.getTime())) {
        finalJoiningDate = parsed;
      }
    }

    const employee = await prisma.employee.upsert({
      where: { email: finalEmail },
      update: { 
        fullName: finalName, 
        employeeCode: String(finalCode), 
        department: empDepartment || "General",
        ...(finalJoiningDate ? { joiningDate: finalJoiningDate } : {})
      },
      create: { 
        email: finalEmail, 
        fullName: finalName, 
        employeeCode: String(finalCode), 
        department: empDepartment || "General", 
        designation: empDesignation || "Employee",
        ...(finalJoiningDate ? { joiningDate: finalJoiningDate } : {})
      }
    });

    const finalFeedbackSource = req.user?.role === 'Voicebox' ? 'VoiceBox' : (feedbackSource || 'Web');

    const parentTicket = await prisma.parentTicket.upsert({
      where: { employeeId_feedbackSource: { employeeId: employee.id, feedbackSource: finalFeedbackSource } },
      update: {},
      create: { employeeId: employee.id, feedbackSource: finalFeedbackSource }
    });

    const newTicket = await prisma.feedbackTicket.create({
      data: {
        parentTicketId: parentTicket.id,
        assignmentNumber: nextAssignmentNumber,
        feedbackSource: finalFeedbackSource,
        category: category || 'General', 
        nature: nature || 'Feedback',
        priority: priority || 'Medium',
        status: 'Open',
        isAnonymous: Boolean(isAnonymous),
        isConfidential: Boolean(isConfidential),
        notes: notes || '',
        empFullName: finalName,
        empEmail: finalEmail,
        empCode: String(finalCode),
        empDepartment: empDepartment || "General",
        empDesignation: empDesignation || "Employee",
        empJoiningDate: finalJoiningDate || undefined,
        assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
        secondaryAssigneeId: secondaryAssigneeId ? parseInt(secondaryAssigneeId) : undefined,
        feedbackTitle: title || '',
        description: description || '',
        feedbackRegistrationDate: feedbackRegistrationDate ? new Date(`${feedbackRegistrationDate}T00:00:00Z`) : undefined,
        attachments: (attachment && attachment.fileName && attachment.fileData) ? {
          create: {
            fileName: attachment.fileName,
            fileData: attachment.fileData,
            mimeType: attachment.mimeType || 'application/octet-stream',
            uploadedByRole: 'Employee'
          }
        } : undefined
      }
    });

    res.status(201).json(formatTicket(newTicket));
  } catch (error) {
    logger.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register feedback' });
  }
});

// ─────────────────────────────────────────────
// GET /api/feedback (List)
// ─────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const isAdmin = role === 'SuperAdmin' || role === 'Admin';
    const whereClause: any = { status: { not: 'Deleted' } };
    if (!isAdmin) {
      whereClause.OR = [
        { assigneeId: Number(userId) },
        { secondaryAssigneeId: Number(userId) }
      ];
    }

    const tickets = await prisma.feedbackTicket.findMany({
      where: whereClause,
      include: { assignee: { include: { employee: true } }, secondaryAssignee: { include: { employee: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets.map(t => formatTicket(t))); 
  } catch (err) {
    logger.error('Fetch Error:', err);
    res.status(500).json([]);
  }
});

// ─────────────────────────────────────────────
// GET /api/feedback/:id (Single View)
// ─────────────────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: { 
        assignee: { include: { employee: true } }, 
        secondaryAssignee: { include: { employee: true } }, 
        parentTicket: { include: { employee: true } }, 
        activities: { include: { performer: { include: { employee: true } } } },
        attachments: true
      }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(formatTicket(ticket));
  } catch (err) {
    res.status(500).json({ error: 'Error fetching ticket detail' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/feedback/:id (Update)
// ─────────────────────────────────────────────
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const performerId = req.user?.userId ? parseInt(String(req.user.userId)) : null;

    // Build update payload — only include defined fields to avoid overwriting with null
    console.log("PATCH Feedback - Request body:", data);
    const updateData: any = {};
    if (data.status !== undefined)             updateData.status = data.status;
    if (data.priority !== undefined)           updateData.priority = data.priority;
    if (data.category !== undefined)           updateData.category = data.category;
    if (data.nature !== undefined)             updateData.nature = data.nature;
    if (data.flag !== undefined)               updateData.flag = data.flag;
    
    if ('assigneeId' in data) {
      updateData.assigneeId = (data.assigneeId !== null && data.assigneeId !== undefined && data.assigneeId !== '') 
        ? parseInt(String(data.assigneeId), 10) 
        : null;
    }
    if ('secondaryAssigneeId' in data) {
      updateData.secondaryAssigneeId = (data.secondaryAssigneeId !== null && data.secondaryAssigneeId !== undefined && data.secondaryAssigneeId !== '') 
        ? parseInt(String(data.secondaryAssigneeId), 10) 
        : null;
    }

    console.log("PATCH Feedback - Compiled updateData:", updateData);

    await prisma.feedbackTicket.update({
      where: { id },
      data: updateData
    });

    // If a new comment/action note was provided, save it as an ActivityTracker entry
    // so it appears in the Ticket Comment history (not in the employee description box)
    const newComment = typeof data.notes === 'string' ? data.notes.trim() : '';
    if (newComment && performerId) {
      await prisma.activityTracker.create({
        data: {
          feedbackId: id,
          action: newComment,
          performedBy: performerId,
          oldValue: null,
          newValue: null,
        }
      });
    }

    // Fetch the fully updated ticket including all relations so formatTicket maps them properly
    const fullyUpdated = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: {
        assignee: { include: { employee: true } },
        secondaryAssignee: { include: { employee: true } },
        parentTicket: { include: { employee: true } },
        activities: { include: { performer: { include: { employee: true } } } },
        attachments: true
      }
    });

    if (!fullyUpdated) {
      res.status(404).json({ error: 'Ticket not found after update' });
      return;
    }

    res.json(formatTicket(fullyUpdated));
  } catch (err) {
    logger.error('Update failed:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/feedback/parent/:id (SOFT DELETE)
// ─────────────────────────────────────────────
router.delete('/parent/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentId = parseInt(req.params.id);
    await prisma.feedbackTicket.updateMany({ where: { parentTicketId: parentId }, data: { status: 'Deleted' } });
    res.json({ success: true, message: 'Ticket soft-deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────
function parseUtcDateOnly(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const dateOnly = value.split('T')[0];
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [_, year, month, day] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return new Date();
}

function getUtcDaysDifference(startValue: any): number {
  const startDate = parseUtcDateOnly(startValue);
  const today = new Date();
  const utcStart = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.floor((utcToday - utcStart) / (1000 * 60 * 60 * 24)));
}

// ─────────────────────────────────────────────
// Helper Function
// ─────────────────────────────────────────────
function formatTicket(t: any): any {
  // STRICT AGING LOGIC: Uses UTC Midnight to completely bypass local timezone glitches
  const regDateSource = t.feedbackRegistrationDate || t.createdAt;
  const calculatedAging = getUtcDaysDifference(regDateSource);

  // SOURCE MAPPING: Backwards compatibility for legacy values and proper display names
  let displaySource = t.feedbackSource || '—';
  const normalizedSource = displaySource.replace(/\s+/g, '');
  if (normalizedSource === 'OthersManagers') {
    displaySource = 'Managers';
  } else if (normalizedSource === 'OthersHelpdesks') {
    displaySource = 'Helpdesks';
  } else if (displaySource === 'PulseCheck') {
    displaySource = 'Pulse Check';
  } else if (displaySource === 'ExitInterview') {
    displaySource = 'Exit Interview';
  } else if (displaySource === 'VoiceBox') {
    displaySource = 'Voice Box';
  }
  if (!displaySource.includes(' ')) {
    displaySource = displaySource.replace(/([A-Z])/g, ' $1').trim();
  }

  return { 
    ...t, 
    feedbackId: `FB-${String(t.id).padStart(4, '0')}`, 
    statusDisplay: t.status === 'Open' ? 'new' : t.status.toLowerCase(), 
    employeeName: t.empFullName, 
    fullName: t.empFullName, 
    email: t.empEmail, 
    employeeCode: t.empCode, 
    designation: t.empDesignation, 
    department: t.empDepartment || "N/A", 
    assigneeName: t.assignee?.employee?.fullName || t.assignee?.name || "Unassigned", 
    secondaryAssigneeName: t.secondaryAssignee?.employee?.fullName || t.secondaryAssignee?.name || "None", 
    registeredCategory: t.category, 
    category: t.category, 
    feedbackSourceDisplay: displaySource,
    agingDays: calculatedAging,
    // Feedback Title: use feedbackTitle field directly (supports older records)
    feedbackTitle: t.feedbackTitle || (t as any).title || '—',
    // STRICT SEPARATION: employee description NEVER mixes with admin notes
    employeeFeedbackDescription: t.description || '',
    internalNotes: t.notes || '',
    // Legacy description: maps ONLY to employee description, NOT to admin notes
    description: t.description || '',
  };
}

// ─────────────────────────────────────────────
// POST /api/feedback/:id/attachments (Admin upload)
// ─────────────────────────────────────────────
router.post('/:id/attachments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbackTicketId = parseInt(req.params.id);
    const { fileName, fileData, mimeType } = req.body;
    const userRole = req.user?.role || 'Admin';

    if (!fileName || !fileData) {
      res.status(400).json({ error: 'Missing file name or data' });
      return;
    }

    const attachment = await prisma.ticketAttachment.create({
      data: {
        feedbackTicketId,
        fileName,
        fileData,
        mimeType: mimeType || 'application/octet-stream',
        uploadedByRole: userRole === 'SuperAdmin' ? 'SuperAdmin' : 'Admin'
      }
    });

    // Also log an activity record for this attachment upload
    const performerId = req.user?.userId ? parseInt(String(req.user.userId)) : null;
    if (performerId) {
      await prisma.activityTracker.create({
        data: {
          feedbackId: feedbackTicketId,
          action: `Uploaded attachment: ${fileName}`,
          performedBy: performerId,
          oldValue: null,
          newValue: null,
        }
      });
    }

    res.status(201).json(attachment);
  } catch (err) {
    logger.error('Failed to upload attachment:', err);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// ─────────────────────────────────────────────
// GET /api/feedback/attachments/download/:id
// ─────────────────────────────────────────────
router.get('/attachments/download/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.id);
    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      res.status(404).send('Attachment not found');
      return;
    }

    // Decode base64 file data
    let base64Data = attachment.fileData;
    if (base64Data.includes(';base64,')) {
      base64Data = base64Data.split(';base64,')[1];
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.send(fileBuffer);
  } catch (err) {
    logger.error('Failed to download attachment:', err);
    res.status(500).send('Failed to download attachment');
  }
});

export default router;