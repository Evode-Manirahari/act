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
  message: z.string().min(1).max(2000),
});

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

// POST /api/chat
router.post('/', chatLimiter, async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { sessionId, message } = parsed.data;

  try {
  // Load session with messages
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      project: { include: { steps: { orderBy: { order: 'asc' } } } },
    },
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Save user message
  await prisma.message.create({
    data: { sessionId, role: 'USER', content: message },
  });

  // Build Claude messages array from history + new message
  const claudeMessages = [
    ...session.messages.map((m: PrismaMessage) => ({
      role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // Add project context to system prompt if in coaching phase
  let systemPrompt = ACT_SYSTEM_PROMPT;
  if (session.project) {
    const project = session.project;
    const currentStep = project.steps[project.currentStepIndex];
    systemPrompt += `\n\n---\nCURRENT PROJECT CONTEXT\nProject: ${project.title}\nDescription: ${project.description}\nProgress: Step ${project.currentStepIndex + 1} of ${project.steps.length}\n${currentStep ? `Current step: ${currentStep.title} — ${currentStep.description}` : 'All steps complete.'}`;
  }

  // Call Claude
  let rawContent: string;
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
    });

    rawContent = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');
  } catch (err) {
    logger.error('Claude API error', { err });
    return res.status(502).json({ error: 'AI service unavailable' });
  }

  // Parse suggestions from response
  const { clean: content, suggestions } = parseSuggestions(rawContent);

  // Determine new phase
  const newPhase: ConversationPhase = suggestions
    ? 'SUGGESTION'
    : session.project
    ? 'COACHING'
    : session.phase;

  // Save assistant message (without the JSON block)
  const savedMessage = await prisma.message.create({
    data: { sessionId, role: 'ASSISTANT', content },
  });

  // Update session phase if changed
  if (newPhase !== session.phase) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { phase: newPhase },
    });
  }

  const responseBody: ChatResponse = {
    message: {
      id: savedMessage.id,
      sessionId: savedMessage.sessionId,
      role: 'ASSISTANT',
      content: savedMessage.content,
      createdAt: savedMessage.createdAt.toISOString(),
    },
    phase: newPhase,
    suggestions: suggestions ?? undefined,
    project: session.project ? {
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
    } : undefined,
  };

  res.json(responseBody);
  } catch (err) {
    logger.error('Chat route error', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
