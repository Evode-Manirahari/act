import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

const RegisterSchema = z.object({
  deviceId: z.string().min(1),
  trade: z.enum(['ELECTRICAL', 'HVAC', 'PLUMBING', 'WELDING']).optional().default('ELECTRICAL'),
});

// POST /api/users/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const { deviceId, trade } = parsed.data;

  try {
    const user = await prisma.user.upsert({
      where: { deviceId },
      update: { trade },
      create: { deviceId, trade },
    });
    logger.info('user registered', { userId: user.id, trade });
    return res.status(201).json(user);
  } catch (err) {
    logger.error('register error', { err });
    return res.status(500).json({ error: 'Failed to register user', code: 'SERVER_ERROR' });
  }
});

// GET /api/users/:deviceId
router.get('/:deviceId', async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
    return res.json(user);
  } catch (err) {
    logger.error('get user error', { err });
    return res.status(500).json({ error: 'Failed to get user', code: 'SERVER_ERROR' });
  }
});

export default router;
