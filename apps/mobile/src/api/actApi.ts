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

export interface Hazard {
  brand: string;
  severity: 'critical' | 'elevated' | 'watch';
  issue: string;
  year_range: string;
  action: string;
}

export interface Intent {
  intent: 'id' | 'safety' | 'code' | 'diagnostic' | 'general';
  coverage: 'complete' | 'partial' | 'insufficient' | 'unknown';
}

export interface StreamCallbacks {
  onTranscript?: (text: string) => void;
  onToken: (chunk: string) => void;
  onHazards?: (hazards: Hazard[]) => void;
  onIntent?: (intent: Intent) => void;
  onAudio?: (url: string) => void;
  onTurnId?: (turnId: string) => void;
  onDone?: () => void;
  onError: (message: string) => void;
}

export interface StreamHandle {
  abort: () => void;
}

const NEEDS_PHOTO_RE = /\[NEEDS_PHOTO:\s*([^\]]+)\]/i;

export function extractNeedsPhotoHint(text: string): { cleaned: string; hint: string | null } {
  const match = text.match(NEEDS_PHOTO_RE);
  if (!match) return { cleaned: text, hint: null };
  const hint = match[1].trim();
  const cleaned = text.replace(NEEDS_PHOTO_RE, '').trimEnd();
  return { cleaned, hint };
}

function streamSSE(url: string, formData: FormData, callbacks: StreamCallbacks): StreamHandle {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData as any,
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        callbacks.onError(`Server ${response.status}: ${body.slice(0, 200)}`);
        return;
      }

      const text = await response.text();
      let doneFired = false;

      for (const block of text.split('\n\n')) {
        if (!block.trim()) continue;
        const ev = parseEventBlock(block);
        if (!ev) continue;
        if (ev.event === 'transcript') callbacks.onTranscript?.(ev.data);
        else if (ev.event === 'token') callbacks.onToken(ev.data);
        else if (ev.event === 'hazards') {
          try {
            callbacks.onHazards?.(JSON.parse(ev.data) as Hazard[]);
          } catch {}
        } else if (ev.event === 'intent') {
          try {
            callbacks.onIntent?.(JSON.parse(ev.data) as Intent);
          } catch {}
        } else if (ev.event === 'audio') callbacks.onAudio?.(ev.data);
        else if (ev.event === 'done') {
          callbacks.onTurnId?.(ev.data);
          doneFired = true;
        }
      }

      if (!doneFired) callbacks.onDone?.();
      else callbacks.onDone?.();
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      callbacks.onError(e?.message ?? 'Network error');
    }
  })();

  return { abort: () => controller.abort() };
}

export interface JobTurnInput {
  photoUri: string;
  question?: string;        // text question (used if no audio)
  audioUri?: string;        // recorded audio file URI
  audioMime?: string;       // e.g. 'audio/m4a'
}

export function streamJobTurn(
  jobId: string,
  input: JobTurnInput,
  callbacks: StreamCallbacks,
): StreamHandle {
  const formData = new FormData();
  formData.append('frame', { uri: input.photoUri, name: 'frame.jpg', type: 'image/jpeg' } as any);
  if (input.question) {
    formData.append('question', input.question);
  }
  if (input.audioUri) {
    formData.append('audio', {
      uri: input.audioUri,
      name: 'voice.m4a',
      type: input.audioMime ?? 'audio/m4a',
    } as any);
  }
  return streamSSE(`${API_BASE}/jobs/${jobId}/turns`, formData, callbacks);
}
