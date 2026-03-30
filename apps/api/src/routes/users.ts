import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const RegisterSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERIENCED']).optional(),
  domain: z.enum(['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'HVAC', 'PAINTING', 'TILING', 'GENERAL']).optional(),
});

// POST /api/users/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { deviceId, name, experienceLevel, domain } = parsed.data;

  const user = await prisma.user.upsert({
    where: { deviceId },
    update: {
      ...(name !== undefined && { name }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(domain !== undefined && { domain }),
    },
    create: {
      deviceId,
      name,
      experienceLevel: experienceLevel ?? 'BEGINNER',
      domain: domain ?? null,
    },
  });

  res.json(user);
});

// GET /api/users/:deviceId
router.get('/:deviceId', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { deviceId: req.params.deviceId },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
