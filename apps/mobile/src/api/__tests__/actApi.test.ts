import { streamJobTurn } from '../actApi';

describe('streamJobTurn', () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  const originalNavigator = global.navigator;

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(global, 'document', {
      configurable: true,
      value: originalDocument,
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    jest.restoreAllMocks();
  });

  it('uses Blob file parts on web instead of serializing URI objects as strings', async () => {
    Object.defineProperty(global, 'document', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { product: 'Gecko' },
    });

    const imageBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
    const sseResponse = new Response('event: done\ndata: t-1\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(imageBlob, { status: 200 }))
      .mockResolvedValueOnce(sseResponse);
    global.fetch = fetchMock as typeof fetch;

    const onDone = jest.fn();
    streamJobTurn(
      'job-1',
      { photoUri: 'blob:http://localhost/photo', question: 'what is this?' },
      { onToken: jest.fn(), onDone, onError: jest.fn() },
    );

    await flushPromises();
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'blob:http://localhost/photo');
    const [, turnRequest] = fetchMock.mock.calls[1];
    const body = (turnRequest as RequestInit).body as FormData;
    const frame = body.get('frame');

    expect(frame).toBeInstanceOf(Blob);
    expect(frame).not.toBe('[object Object]');
    expect(body.get('question')).toBe('what is this?');
    expect(onDone).toHaveBeenCalled();
  });

  it('uses the picker File directly on web when one is available', async () => {
    Object.defineProperty(global, 'document', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { product: 'Gecko' },
    });

    const pickedFile = new File(['fake-image'], 'picked.jpg', { type: 'image/jpeg' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response('event: done\ndata: t-1\n\n', {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    streamJobTurn(
      'job-1',
      {
        photoUri: 'blob:http://localhost/photo',
        photoFile: pickedFile,
        question: 'what is this?',
      },
      { onToken: jest.fn(), onDone: jest.fn(), onError: jest.fn() },
    );

    await flushPromises();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, turnRequest] = fetchMock.mock.calls[0];
    const body = (turnRequest as RequestInit).body as FormData;
    const frame = body.get('frame');
    expect(frame).toBeInstanceOf(Blob);
    expect(frame).not.toBe('[object Object]');
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
