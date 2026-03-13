import { Router, Request, Response } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import {
  ELECTRICAL_SYSTEM_PROMPT,
  HVAC_SYSTEM_PROMPT,
  PLUMBING_SYSTEM_PROMPT,
  WELDING_SYSTEM_PROMPT,
} from '@actober/trade-knowledge';

import { chatLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(chatLimiter);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ChatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  imageBase64: z.string().optional(),
});

function getSystemPrompt(trade: string): string {
  switch (trade) {
    case 'HVAC':     return HVAC_SYSTEM_PROMPT;
    case 'PLUMBING': return PLUMBING_SYSTEM_PROMPT;
    case 'WELDING':  return WELDING_SYSTEM_PROMPT;
    case 'ELECTRICAL':
    default:
      return ELECTRICAL_SYSTEM_PROMPT;
  }
}

function getVisionContext(trade: string): string {
  const contexts: Record<string, string> = {
    ELECTRICAL: 'Identify all wires, panels, components, and hazards visible. Lead with any safety concerns.',
    HVAC: 'Identify all HVAC components, connections, and conditions visible. Note refrigerant leaks, corrosion, and electrical hazards.',
    PLUMBING: 'Identify all pipes, fittings, fixtures, and conditions visible. Note leaks, corrosion, improper materials, or code violations.',
    WELDING: 'Assess this weld or pre-weld setup. Note fit-up, material condition, and any defects or safety concerns.',
  };
  const detail = contexts[trade] ?? contexts['ELECTRICAL'];
  return `\n\nYou are viewing a real photo from the field. ${detail} Give immediate actionable guidance.`;
}

function isSafetyAlert(content: string): boolean {
  return /⚠️|DANGER|HAZARD|WARNING|DO NOT|STOP/i.test(content);
}

// POST /api/chat
router.post('/', async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
  }

  const { sessionId, message, imageBase64 } = parsed.data;

  try {
    // Fetch session with history
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });
    }

    // Save user message
    await prisma.message.create({
      data: { sessionId, role: 'USER', content: message },
    });

    // Build message history for OpenAI
    const historyMessages = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

    // Build current user message content
    let userContent: OpenAI.Chat.ChatCompletionContentPart[] | string;

    if (imageBase64) {
      const systemAppend = getVisionContext(session.trade);

      userContent = [
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
        { type: 'text', text: message },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: getSystemPrompt(session.trade) + systemAppend },
          ...historyMessages,
          { role: 'user', content: userContent },
        ],
        max_tokens: 1024,
      });

      const aiContent = response.choices[0]?.message?.content || 'No response.';
      const alertFlag = isSafetyAlert(aiContent);

      // Store image hash instead of full base64
      const crypto = await import('crypto');
      const imageKey = crypto.createHash('sha256').update(imageBase64).digest('hex').slice(0, 16);

      const aiMessage = await prisma.message.create({
        data: {
          sessionId,
          role: 'ASSISTANT',
          content: aiContent,
          imageKey,
          isSafetyAlert: alertFlag,
        },
      });

      if (alertFlag) logger.warn('safety alert triggered', { sessionId, trade: session.trade });

      return res.json({ message: aiContent, isSafetyAlert: alertFlag, sessionId });
    }

    // Text-only path
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: getSystemPrompt(session.trade) },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
    });

    const aiContent = response.choices[0]?.message?.content || 'No response.';
    const alertFlag = isSafetyAlert(aiContent);

    await prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: aiContent,
        isSafetyAlert: alertFlag,
      },
    });

    if (alertFlag) logger.warn('safety alert triggered', { sessionId, trade: session.trade });

    return res.json({ message: aiContent, isSafetyAlert: alertFlag, sessionId });
  } catch (err) {
    logger.error('chat error', { err });
    return res.status(500).json({ error: 'Chat failed', code: 'SERVER_ERROR' });
  }
});

export default router;
