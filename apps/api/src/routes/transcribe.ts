import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { logger } from '../lib/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/transcribe — multipart audio → Whisper → { text }
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const audioFile = new File(
      [req.file.buffer],
      'audio.m4a',
      { type: req.file.mimetype || 'audio/m4a' }
    );

    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    res.json({ text: result.text });
  } catch (err) {
    logger.error('Transcription error', { err });
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
