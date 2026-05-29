jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  FileSystemUploadType: {
    BINARY_CONTENT: 'BINARY_CONTENT',
    MULTIPART: 'MULTIPART',
  },
}));

import {
  getJobOutcome,
  upsertJobOutcome,
} from '../captureApi';

describe('capture outcome API', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('upserts a job outcome with the deployed backend payload shape', async () => {
    const outcome = {
      id: 'outcome-1',
      job_id: 'job-1',
      final_diagnosis: 'Failed run capacitor',
      fix: 'Replaced capacitor and verified split',
      callback: false,
      callback_at: null,
      manager_notes: 'Diagnosis time: 30 minutes.',
      recorded_by: 'user-1',
      created_at: '2026-05-29T00:00:00.000Z',
    };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(outcome));
    global.fetch = fetchMock as typeof fetch;

    await upsertJobOutcome({
      jobId: 'job-1',
      finalDiagnosis: 'Failed run capacitor',
      fix: 'Replaced capacitor and verified split',
      callback: false,
      managerNotes: 'Diagnosis time: 30 minutes.',
      recordedBy: 'user-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/jobs/job-1/outcomes'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      final_diagnosis: 'Failed run capacitor',
      fix: 'Replaced capacitor and verified split',
      callback: false,
      callback_at: null,
      manager_notes: 'Diagnosis time: 30 minutes.',
      recorded_by: 'user-1',
    });
  });

  it('fetches the one outcome row for a job', async () => {
    const outcome = {
      id: 'outcome-1',
      job_id: 'job-1',
      final_diagnosis: null,
      fix: null,
      callback: true,
      callback_at: '2026-05-29T00:00:00.000Z',
      manager_notes: null,
      recorded_by: null,
      created_at: '2026-05-29T00:00:00.000Z',
    };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(outcome));
    global.fetch = fetchMock as typeof fetch;

    await expect(getJobOutcome('job-1')).resolves.toEqual(outcome);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/jobs/job-1/outcomes'),
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
