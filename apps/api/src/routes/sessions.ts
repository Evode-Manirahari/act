import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

const CreateSessionSchema = z.object({
  userId: z.string().min(1),
  trade: z.enum(['ELECTRICAL', 'HVAC', 'PLUMBING', 'WELDING']),
  jobAddress: z.string().optional(),
});

const PatchSessionSchema = z.object({
  endedAt: z.string().datetime().optional(),
  jobNotes: z.string().optional(),
});

// POST /api/sessions
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const { userId, trade, jobAddress } = parsed.data;

  try {
    const session = await prisma.session.create({
      data: { userId, trade, jobAddress },
      include: { messages: true },
    });
    logger.info('session created', { sessionId: session.id, trade });
    return res.status(201).json(session);
  } catch (err) {
    logger.error('create session error', { err });
    return res.status(500).json({ error: 'Failed to create session', code: 'SERVER_ERROR' });
  }
});

// GET /api/sessions/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }
    return res.json(session);
  } catch (err) {
    logger.error('get session error', { err });
    return res.status(500).json({ error: 'Failed to get session', code: 'SERVER_ERROR' });
  }
});

// GET /api/sessions/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const sessions = await prisma.session.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    });
    return res.json(sessions);
  } catch (err) {
    logger.error('get user sessions error', { err });
    return res.status(500).json({ error: 'Failed to get sessions', code: 'SERVER_ERROR' });
  }
});

// PATCH /api/sessions/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = PatchSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const { endedAt, jobNotes } = parsed.data;

  try {
    const session = await prisma.session.update({
      where: { id },
      data: {
        ...(endedAt ? { endedAt: new Date(endedAt) } : {}),
        ...(jobNotes !== undefined ? { jobNotes } : {}),
      },
    });
    logger.info('session updated', { sessionId: id });
    return res.json(session);
  } catch (err) {
    logger.error('patch session error', { err });
    return res.status(500).json({ error: 'Failed to update session', code: 'SERVER_ERROR' });
  }
});

export default router;
