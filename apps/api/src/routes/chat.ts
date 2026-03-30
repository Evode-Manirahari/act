import { Router, Request, Response } from 'express';
import { PrismaClient, Message as PrismaMessage, Step as PrismaStep } from '@prisma/client';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '../lib/claude';
import { ACT_SYSTEM_PROMPT } from '@actober/act-prompts';
import { chatLimiter } from '../middleware/rateLimiter';
import { logger } from '../lib/logger';
import type { ProjectSuggestion, ChatResponse, ConversationPhase } from '@actober/shared-types';

const router = Router();
const prisma = new PrismaClient();

const ChatSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  imageBase64: z.string().optional(),
  imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
});

// Domain labels for system prompt injection
const DOMAIN_LABELS: Record<string, string> = {
  PLUMBING: 'plumbing and pipe work',
  ELECTRICAL: 'electrical work',
  CARPENTRY: 'carpentry and woodworking',
  HVAC: 'HVAC and ventilation systems',
  PAINTING: 'painting and surface finishing',
  TILING: 'tiling and masonry',
  GENERAL: 'general trades and DIY',
};

// Parse [SUGGESTIONS_JSON]...[/SUGGESTIONS_JSON] block from ACT's response
function parseSuggestions(text: string): { clean: string; suggestions: ProjectSuggestion[] | null } {
  const match = text.match(/\[SUGGESTIONS_JSON\]([\s\S]*?)\[\/SUGGESTIONS_JSON\]/);
  if (!match) return { clean: text, suggestions: null };

  try {
    const suggestions = JSON.parse(match[1].trim()) as ProjectSuggestion[];
    const clean = text.replace(match[0], '').trim();
    return { clean, suggestions };
  } catch {
    return { clean: text, suggestions: null };
  }
}

// Send a single SSE event
function sseEvent(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// POST /api/chat — streaming SSE
router.post('/', chatLimiter, async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { sessionId, message, imageBase64, imageMimeType } = parsed.data;

  try {
    // Load session with messages and user (for domain)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        project: { include: { steps: { orderBy: { order: 'asc' } } } },
        user: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save user message immediately
    await prisma.message.create({
      data: { sessionId, role: 'USER', content: message },
    });

    // Build Claude messages from history
    const historyMessages = session.messages.map((m: PrismaMessage) => ({
      role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    // Build the new user message content — with optional image
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

    let newUserContent: string | ContentBlock[];
    if (imageBase64 && imageMimeType) {
      newUserContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: imageMimeType,
            data: imageBase64,
          },
        },
        { type: 'text' as const, text: message },
      ];
    } else {
      newUserContent = message;
    }

    const claudeMessages = [
      ...historyMessages,
      { role: 'user' as const, content: newUserContent },
    ];

    // Build system prompt with optional domain + project context
    let systemPrompt = ACT_SYSTEM_PROMPT;

    const userDomain = (session.user as any)?.domain as string | null;
    if (userDomain && DOMAIN_LABELS[userDomain]) {
      systemPrompt += `\n\n---\nUSER DOMAIN: This user primarily works in ${DOMAIN_LABELS[userDomain]}. Tailor your vocabulary, safety warnings, and guidance to this trade.`;
    }

    if (session.project) {
      const project = session.project;
      const currentStep = project.steps[project.currentStepIndex];
      systemPrompt += `\n\n---\nCURRENT JOB CONTEXT\nJob: ${project.title}\nDescription: ${project.description}\nProgress: Step ${project.currentStepIndex + 1} of ${project.steps.length}\n${currentStep ? `Current step: ${currentStep.title} — ${currentStep.description}` : 'All steps complete.'}`;
    }

    // Set up SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable buffering
    res.flushHeaders();

    // Stream from Claude
    let fullContent = '';
    try {
      const stream = anthropic.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: claudeMessages,
      });

      stream.on('text', (delta: string) => {
        fullContent += delta;
        sseEvent(res, { type: 'delta', content: delta });
      });

      await stream.finalMessage();
    } catch (err) {
      logger.error('Claude stream error', { err });
      sseEvent(res, { type: 'error', message: 'AI service unavailable' });
      res.end();
      return;
    }

    // Parse suggestions from accumulated content
    const { clean: content, suggestions } = parseSuggestions(fullContent);

    // Determine new phase
    const newPhase: ConversationPhase = suggestions
      ? 'SUGGESTION'
      : session.project
      ? 'COACHING'
      : session.phase;

    // Save assistant message and update phase
    const [savedMessage] = await Promise.all([
      prisma.message.create({
        data: { sessionId, role: 'ASSISTANT', content },
      }),
      newPhase !== session.phase
        ? prisma.session.update({ where: { id: sessionId }, data: { phase: newPhase } })
        : Promise.resolve(null),
    ]);

    // Send final done event with full metadata
    const donePayload: ChatResponse = {
      message: {
        id: savedMessage.id,
        sessionId: savedMessage.sessionId,
        role: 'ASSISTANT',
        content: savedMessage.content,
        createdAt: savedMessage.createdAt.toISOString(),
      },
      phase: newPhase,
      suggestions: suggestions ?? undefined,
      project: session.project
        ? {
            id: session.project.id,
            userId: session.project.userId,
            title: session.project.title,
            description: session.project.description,
            category: session.project.category as any,
            status: session.project.status as any,
            materials: session.project.materials,
            timeRequired: session.project.timeRequired,
            steps: session.project.steps.map((s: PrismaStep) => ({
              id: s.id,
              projectId: s.projectId,
              order: s.order,
              title: s.title,
              description: s.description,
              completed: s.completed,
            })),
            currentStepIndex: session.project.currentStepIndex,
            contextSnapshot: session.project.contextSnapshot,
            startedAt: session.project.startedAt?.toISOString(),
            completedAt: session.project.completedAt?.toISOString(),
            createdAt: session.project.createdAt.toISOString(),
          }
        : undefined,
    };

    sseEvent(res, { type: 'done', ...donePayload });
    res.end();
  } catch (err) {
    logger.error('Chat route error', { err });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      sseEvent(res, { type: 'error', message: 'Internal server error' });
      res.end();
    }
  }
});

export default router;
