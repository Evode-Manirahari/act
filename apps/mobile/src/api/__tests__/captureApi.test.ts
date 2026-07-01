jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  FileSystemUploadType: {
    BINARY_CONTENT: 'BINARY_CONTENT',
    MULTIPART: 'MULTIPART',
  },
}), { virtual: true });

import {
  getDemoContext,
  getJobOutcome,
  logJobEvent,
  requestRecordingRedaction,
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

  it('fetches demo context without creating a field job', async () => {
    const context = { account_id: 'acct-1', user_id: 'user-1', role: 'senior_tech' };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(context));
    global.fetch = fetchMock as typeof fetch;

    await expect(getDemoContext()).resolves.toEqual(context);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/demo/context'));
  });

  it('logs workflow events with the normalized backend payload', async () => {
    const event = {
      id: 'event-1',
      account_id: 'acct-1',
      actor_id: 'user-1',
      job_id: 'job-1',
      recording_id: 'rec-1',
      event_type: 'mark_added',
      source: 'mobile',
      payload_json: { mark_type: 'safety' },
      occurred_at: '2026-06-24T00:00:00.000Z',
      created_at: '2026-06-24T00:00:00.000Z',
    };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(event));
    global.fetch = fetchMock as typeof fetch;

    await logJobEvent({
      eventType: 'mark_added',
      actorId: 'user-1',
      jobId: 'job-1',
      recordingId: 'rec-1',
      payload: { mark_type: 'safety' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/job-events'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      event_type: 'mark_added',
      actor_id: 'user-1',
      job_id: 'job-1',
      recording_id: 'rec-1',
      source: 'mobile',
      payload_json: { mark_type: 'safety' },
    });
  });

  it('requests source recording redaction without purging media from mobile', async () => {
    const recording = {
      id: 'rec-1',
      job_id: 'job-1',
      user_id: 'user-1',
      storage_key: 'recordings/rec-1.mp4',
      content_type: 'video/mp4',
      trade: 'hvac',
      status: 'ready',
      consent_state: 'internal_training',
      redaction_state: 'requested',
      redaction_reason: 'Customer requested removal.',
      redaction_requested_by: 'user-1',
      redaction_requested_at: '2026-06-30T00:00:00.000Z',
      duration_s: 120,
      bytes_uploaded: 1024,
      started_at: null,
      ended_at: null,
      device_meta: null,
      created_at: '2026-06-30T00:00:00.000Z',
    };
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(recording));
    global.fetch = fetchMock as typeof fetch;

    await expect(requestRecordingRedaction({
      recordingId: 'rec-1',
      reason: 'Customer requested removal.',
      requestedBy: 'user-1',
    })).resolves.toEqual(recording);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recordings/rec-1/redaction'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      reason: 'Customer requested removal.',
      requested_by: 'user-1',
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
