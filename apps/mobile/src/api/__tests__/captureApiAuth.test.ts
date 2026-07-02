/** Token attachment + authenticated identity bootstrap (pilot auth Phase 4). */

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  FileSystemUploadType: {
    BINARY_CONTENT: 'BINARY_CONTENT',
    MULTIPART: 'MULTIPART',
  },
}), { virtual: true });

jest.mock('../../lib/authToken', () => ({
  getAuthHeaders: jest.fn(),
  hasAuthSession: jest.fn(),
}));

import { getAuthHeaders, hasAuthSession } from '../../lib/authToken';
import { createCaptureSession, getJobOutcome, getPilotContext } from '../captureApi';
import { searchLibrary } from '../libraryApi';

const mockGetAuthHeaders = getAuthHeaders as jest.Mock;
const mockHasAuthSession = hasAuthSession as jest.Mock;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('auth header attachment', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('captureApi requests carry the Bearer header when a session exists', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer tok-1' });
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({}));
    global.fetch = fetchMock as typeof fetch;

    await getJobOutcome('job-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-1');
  });

  it('libraryApi requests carry the Bearer header when a session exists', async () => {
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer tok-2' });
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse([]));
    global.fetch = fetchMock as typeof fetch;

    await searchLibrary({});

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-2');
  });

  it('requests stay anonymous without a session', async () => {
    mockGetAuthHeaders.mockResolvedValue({});
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({}));
    global.fetch = fetchMock as typeof fetch;

    await getJobOutcome('job-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('identity bootstrap', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('getPilotContext uses /me when logged in', async () => {
    mockHasAuthSession.mockResolvedValue(true);
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer tok' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: 'u1', account_id: 'a1', role: 'senior_tech' }));
    global.fetch = fetchMock as typeof fetch;

    const ctx = await getPilotContext();

    expect(fetchMock.mock.calls[0][0]).toContain('/me');
    expect(ctx.user_id).toBe('u1');
  });

  it('getPilotContext falls back to /demo/context when logged out', async () => {
    mockHasAuthSession.mockResolvedValue(false);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: 'u1', account_id: 'a1' }));
    global.fetch = fetchMock as typeof fetch;

    await getPilotContext();

    expect(fetchMock.mock.calls[0][0]).toContain('/demo/context');
  });

  it('createCaptureSession creates a real job under the verified identity', async () => {
    mockHasAuthSession.mockResolvedValue(true);
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer tok' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: 'u1', account_id: 'a1', role: 'senior_tech' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'job-9' }));
    global.fetch = fetchMock as typeof fetch;

    const session = await createCaptureSession();

    expect(fetchMock.mock.calls[0][0]).toContain('/me');
    expect(fetchMock.mock.calls[1][0]).toContain('/jobs');
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
    expect(session).toEqual({
      job_id: 'job-9',
      user_id: 'u1',
      account_id: 'a1',
      role: 'senior_tech',
    });
  });

  it('createCaptureSession keeps the demo-session flow when logged out', async () => {
    mockHasAuthSession.mockResolvedValue(false);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ job_id: 'j1', user_id: 'u1', account_id: 'a1', role: 'senior_tech' }),
      );
    global.fetch = fetchMock as typeof fetch;

    const session = await createCaptureSession();

    expect(fetchMock.mock.calls[0][0]).toContain('/demo/session');
    expect(session.job_id).toBe('j1');
  });
});
