import request from 'supertest';
import fs from 'fs';

// Mock OpenAI before importing app
const mockTranscriptionsCreate = jest.fn().mockResolvedValue({ text: 'check the panel breaker' });

jest.mock('openai', () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '✅ Looks good.' } }],
        }),
      },
    },
    audio: {
      transcriptions: {
        create: mockTranscriptionsCreate,
      },
    },
  }));
  (MockOpenAI as any).toFile = jest.fn().mockResolvedValue({ name: 'audio.m4a' });
  return MockOpenAI;
});

import app from '../app';

const TMP_DIR = '/tmp/actober-audio';

beforeAll(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
});

beforeEach(() => {
  mockTranscriptionsCreate.mockResolvedValue({ text: 'check the panel breaker' });
});

describe('POST /api/transcribe', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await request(app).post('/api/transcribe');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FILE');
  });

  it('returns transcript when audio file is provided', async () => {
    const tmpFile = `${TMP_DIR}/test-${Date.now()}.m4a`;
    fs.writeFileSync(tmpFile, Buffer.from('fake-audio-data'));

    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', tmpFile, { contentType: 'audio/m4a', filename: 'audio.m4a' });

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe('check the panel breaker');

    fs.unlinkSync(tmpFile);
  });

  it('returns 500 with TRANSCRIPTION_ERROR on OpenAI failure', async () => {
    mockTranscriptionsCreate.mockRejectedValueOnce(new Error('OpenAI unavailable'));

    const tmpFile = `${TMP_DIR}/fail-${Date.now()}.m4a`;
    fs.writeFileSync(tmpFile, Buffer.from('bad-audio'));

    const res = await request(app)
      .post('/api/transcribe')
      .attach('audio', tmpFile, { contentType: 'audio/m4a', filename: 'audio.m4a' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('TRANSCRIPTION_ERROR');

    fs.unlinkSync(tmpFile);
  });
});
