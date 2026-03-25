import { Router, Request, Response } from 'express';
import { PrismaClient, Step as PrismaStep } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const CreateProjectSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['MAKE', 'IMPROVE', 'GROW', 'CREATE']),
  materials: z.array(z.string()),
  timeRequired: z.number().int().positive(),
  contextSnapshot: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
});

const UpdateProjectSchema = z.object({
  status: z.enum(['SUGGESTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  stepCompleted: z.number().int().min(0).optional(), // mark step at this index completed
});

// POST /api/projects — commit to a project
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { userId, sessionId, steps, ...projectData } = parsed.data;

  const project = await prisma.project.create({
    data: {
      ...projectData,
      userId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      steps: {
        create: steps.map((s, i) => ({
          order: i,
          title: s.title,
          description: s.description,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  // Link session to project and move to COACHING phase
  await prisma.session.update({
    where: { id: sessionId },
    data: { projectId: project.id, phase: 'COACHING' },
  });

  res.status(201).json(project);
});

// PATCH /api/projects/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { status, currentStepIndex, stepCompleted } = parsed.data;

  // Mark a step as completed if requested
  if (stepCompleted !== undefined) {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { steps: true } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const step = project.steps.find((s: PrismaStep) => s.order === stepCompleted);
    if (step) {
      await prisma.step.update({ where: { id: step.id }, data: { completed: true } });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (currentStepIndex !== undefined) updateData.currentStepIndex = currentStepIndex;
  if (status === 'COMPLETED') updateData.completedAt = new Date();

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: updateData,
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  res.json(project);
});

// GET /api/projects/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.params.userId },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

export default router;
