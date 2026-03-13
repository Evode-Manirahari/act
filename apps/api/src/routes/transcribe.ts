import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createReadStream } from 'fs';
import OpenAI, { toFile } from 'openai';
import { logger } from '../utils/logger';

import { transcribeLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(transcribeLimiter);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const upload = multer({
  dest: '/tmp/actober-audio/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/transcribe
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided', code: 'MISSING_FILE' });
  }

  const { path: filePath } = req.file;

  try {
    const audioFile = await toFile(createReadStream(filePath), 'audio.m4a', { type: 'audio/m4a' });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    const transcript = transcription.text?.trim() ?? '';
    logger.info('transcription complete', { chars: transcript.length });

    return res.json({ transcript });
  } catch (err) {
    logger.error('transcription error', { err });
    return res.status(500).json({ error: 'Transcription failed', code: 'TRANSCRIPTION_ERROR' });
  }
});

export default router;
