import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = Router();

const CreateRecordingSchema = z.object({
  parentTicketId: z.number().int(),
  recordingId: z.string().min(1),
  recordingUrl: z.string().url().optional(),
  category: z.string().min(1),
  durationSeconds: z.number().int().optional(),
  recordedAt: z.string().optional(),
});

const UpdateInsightsSchema = z.object({
  extractedInsights: z.record(z.unknown()),
  transcription: z.string().optional(),
});

// POST /api/recordings — store recording metadata
router.post('/', requireRole('Admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = CreateRecordingSchema.parse(req.body);

    const recording = await prisma.callRecording.create({
      data: {
        parentTicketId: data.parentTicketId,
        recordingId: data.recordingId,
        recordingUrl: data.recordingUrl,
        category: data.category,
        durationSeconds: data.durationSeconds,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : undefined,
        processingStatus: 'pending',
      },
    });

    res.status(201).json(recording);
  } catch (err) {
    throw err;
  }
});

// GET /api/recordings/:parentTicketId
router.get('/:parentTicketId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const recordings = await prisma.callRecording.findMany({
      where: { parentTicketId: parseInt(req.params.parentTicketId) },
      orderBy: { recordedAt: 'desc' },
    });
    res.json(recordings);
  } catch (err) {
    throw err;
  }
});

// PATCH /api/recordings/:id/insights — store AI-extracted insights
router.patch('/:id/insights', requireRole('Admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = UpdateInsightsSchema.parse(req.body);

    const updated = await prisma.callRecording.update({
      where: { id: parseInt(req.params.id) },
      data: {
        extractedInsights: JSON.stringify(data.extractedInsights),
        transcription: data.transcription,
        processingStatus: 'done',
      },
    });

    res.json(updated);
  } catch (err) {
    throw err;
  }
});

export default router;
