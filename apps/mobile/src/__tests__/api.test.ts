import { registerUser, getUser, createSession, sendMessage, ApiError } from '../api/actober';

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

function mockResponse(body: object, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => mockFetch.mockClear());

describe('registerUser', () => {
  it('posts to /api/users/register and returns user', async () => {
    const user = { id: 'u1', deviceId: 'dev-1', trade: 'ELECTRICAL', createdAt: new Date().toISOString() };
    mockFetch.mockReturnValueOnce(mockResponse(user));

    const result = await registerUser('dev-1', 'ELECTRICAL');
    expect(result.deviceId).toBe('dev-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/register'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws ApiError on 400', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'Invalid' }, 400));
    await expect(registerUser('')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getUser', () => {
  it('fetches user by deviceId', async () => {
    const user = { id: 'u1', deviceId: 'dev-1', trade: 'ELECTRICAL', createdAt: new Date().toISOString() };
    mockFetch.mockReturnValueOnce(mockResponse(user));

    const result = await getUser('dev-1');
    expect(result.id).toBe('u1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/dev-1'),
      expect.any(Object)
    );
  });

  it('throws ApiError on 404', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'Not found' }, 404));
    await expect(getUser('unknown')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('createSession', () => {
  it('posts and returns session', async () => {
    const session = {
      id: 's1', userId: 'u1', trade: 'ELECTRICAL',
      startedAt: new Date().toISOString(), messages: [],
    };
    mockFetch.mockReturnValueOnce(mockResponse(session));

    const result = await createSession('u1', 'ELECTRICAL');
    expect(result.id).toBe('s1');
  });
});

describe('sendMessage', () => {
  it('returns chat response with isSafetyAlert', async () => {
    const response = { message: '✅ Looks safe.', isSafetyAlert: false, sessionId: 's1' };
    mockFetch.mockReturnValueOnce(mockResponse(response));

    const result = await sendMessage('s1', 'Is this wire safe?');
    expect(result.message).toBe('✅ Looks safe.');
    expect(result.isSafetyAlert).toBe(false);
  });

  it('returns isSafetyAlert true for danger responses', async () => {
    const response = { message: '⚠️ DANGER: live wire', isSafetyAlert: true, sessionId: 's1' };
    mockFetch.mockReturnValueOnce(mockResponse(response));

    const result = await sendMessage('s1', 'Check this panel');
    expect(result.isSafetyAlert).toBe(true);
  });

  it('retries once on timeout then throws', async () => {
    // Simulate AbortError twice
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    mockFetch
      .mockRejectedValueOnce(abortErr)
      .mockRejectedValueOnce(abortErr);

    await expect(sendMessage('s1', 'Hello')).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
