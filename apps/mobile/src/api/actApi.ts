const API_BASE = 'https://act-api-evode.fly.dev';

interface SSEEvent {
  event: string;
  data: string;
}

function parseEventBlock(block: string): SSEEvent | null {
  if (!block.trim()) return null;
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (!dataLines.length) return null;
  return { event, data: dataLines.join('\n') };
}

export interface DemoSession {
  job_id: string;
  user_id: string;
  account_id: string;
}

export async function createDemoSession(): Promise<DemoSession> {
  const response = await fetch(`${API_BASE}/demo/session`, { method: 'POST' });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Session ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

export interface StreamCallbacks {
  onTranscript?: (text: string) => void;
  onToken: (chunk: string) => void;
  onAudio?: (url: string) => void;
  onTurnId?: (turnId: string) => void;
  onDone?: () => void;
  onError: (message: string) => void;
}

export interface StreamHandle {
  abort: () => void;
}

function streamSSE(url: string, formData: FormData, callbacks: StreamCallbacks): StreamHandle {
  const xhr = new XMLHttpRequest();
  let lastReadIndex = 0;
  let buffer = '';
  let doneFired = false;

  function flushBuffer() {
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const ev = parseEventBlock(block);
      if (ev) {
        if (ev.event === 'transcript') callbacks.onTranscript?.(ev.data);
        else if (ev.event === 'token') callbacks.onToken(ev.data);
        else if (ev.event === 'audio') callbacks.onAudio?.(ev.data);
        else if (ev.event === 'done') {
          callbacks.onTurnId?.(ev.data);
          if (!doneFired) {
            doneFired = true;
            callbacks.onDone?.();
          }
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }

  xhr.open('POST', url, true);
  xhr.setRequestHeader('Accept', 'text/event-stream');

  xhr.onprogress = () => {
    if (xhr.readyState < 3) return;
    const fresh = xhr.responseText.slice(lastReadIndex);
    lastReadIndex = xhr.responseText.length;
    buffer += fresh;
    flushBuffer();
  };

  xhr.onload = () => {
    flushBuffer();
    if (xhr.status >= 200 && xhr.status < 300) {
      if (!doneFired) {
        doneFired = true;
        callbacks.onDone?.();
      }
    } else {
      callbacks.onError(`Server ${xhr.status}: ${xhr.responseText.slice(0, 200)}`);
    }
  };

  xhr.onerror = () => callbacks.onError('Network error');
  xhr.ontimeout = () => callbacks.onError('Request timed out');

  xhr.send(formData as any);

  return { abort: () => xhr.abort() };
}

export function streamJobTurn(
  jobId: string,
  photoUri: string,
  question: string,
  callbacks: StreamCallbacks,
): StreamHandle {
  const formData = new FormData();
  formData.append('frame', { uri: photoUri, name: 'frame.jpg', type: 'image/jpeg' } as any);
  formData.append('question', question);
  return streamSSE(`${API_BASE}/jobs/${jobId}/turns`, formData, callbacks);
}
