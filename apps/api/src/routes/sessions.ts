import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const CreateSessionSchema = z.object({
  userId: z.string().uuid(),
});

// POST /api/sessions
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const session = await prisma.session.create({
    data: { userId: parsed.data.userId },
    include: { messages: true },
  });

  res.status(201).json(session);
});

// GET /api/sessions/:id
router.get('/:id', async (req: Request, res: Response) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      project: { include: { steps: { orderBy: { order: 'asc' } } } },
    },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

export default router;
