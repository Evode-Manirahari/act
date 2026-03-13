import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/redis';
import { logger } from '../utils/logger';
import { buildPdf, JobReport } from '../utils/pdfBuilder';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PDF_TTL_SECS = 60 * 60 * 24; // 24 hours

// ── GET /api/sessions/:id/summary ────────────────────────────────────────────
router.get('/:id/summary', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });

    // Return cached summary if already generated
    if (session.summary) return res.json({ summary: session.summary });

    if (!session.messages.length) {
      return res.json({ summary: 'No messages in this session.' });
    }

    const transcript = session.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a concise technical writer. Summarize this trade job session in 2-3 sentences. Focus on what was found, any hazards, and what was done.',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 200,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? 'Summary unavailable.';

    // Persist to DB
    await prisma.session.update({ where: { id }, data: { summary } });

    logger.info('summary generated', { sessionId: id });
    return res.json({ summary });
  } catch (err) {
    logger.error('summary error', { err });
    return res.status(500).json({ error: 'Failed to generate summary', code: 'SERVER_ERROR' });
  }
});

// ── GET /api/sessions/:id/export ─────────────────────────────────────────────
router.get('/:id/export', async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `actober:session:${id}:pdf`;

  try {
    // Check Redis cache first
    const redis = getRedis();
    const cached = await redis.getBuffer(cacheKey).catch(() => null);
    if (cached) {
      logger.info('pdf cache hit', { sessionId: id });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="actober-job-${id.slice(0, 8)}.pdf"`);
      return res.send(cached);
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' });

    // Build transcript
    const transcript = session.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // Generate structured report via GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer for professional trade job reports. Return ONLY valid JSON — no markdown, no code fences.',
        },
        {
          role: 'user',
          content: `Generate a structured job report from this session transcript. Return JSON with exactly these keys:
{
  "summary": "2-3 sentence overview",
  "conditions": ["array of site conditions found"],
  "workPerformed": ["array of work items completed"],
  "safetyAlerts": ["array of hazards identified, empty if none"],
  "codeRefs": ["array of NEC or code sections cited, empty if none"],
  "followUp": ["array of recommended next steps"]
}

Transcript:
${transcript}`,
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    let reportData: Omit<JobReport, 'sessionId' | 'trade' | 'jobAddress' | 'date'>;
    try {
      reportData = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    } catch {
      reportData = {
        summary: 'Report generation failed.',
        conditions: [],
        workPerformed: [],
        safetyAlerts: [],
        codeRefs: [],
        followUp: [],
      };
    }

    const report: JobReport = {
      sessionId: id,
      trade: session.trade,
      jobAddress: session.jobAddress,
      date: session.startedAt,
      ...reportData,
    };

    const pdfBuffer = await buildPdf(report);

    // Cache in Redis for 24h
    await redis.set(cacheKey, pdfBuffer, 'EX', PDF_TTL_SECS).catch(() => {});

    // Persist summary to session if not already set
    if (!session.summary && reportData.summary) {
      await prisma.session.update({ where: { id }, data: { summary: reportData.summary } }).catch(() => {});
    }

    logger.info('pdf generated', { sessionId: id, bytes: pdfBuffer.length });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="actober-job-${id.slice(0, 8)}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error('export error', { err });
    return res.status(500).json({ error: 'Export failed', code: 'SERVER_ERROR' });
  }
});

export default router;
