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

function streamSSE(
  url: string,
  formData: FormData | Promise<FormData>,
  callbacks: StreamCallbacks,
): StreamHandle {
  const controller = new AbortController();

  (async () => {
    try {
      const body = await formData;
      const response = await fetch(url, {
        method: 'POST',
        body: body as any,
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
  photoFile?: Blob;
  question?: string;        // text question (used if no audio)
  audioUri?: string;        // recorded audio file URI
  audioFile?: Blob;
  audioMime?: string;       // e.g. 'audio/m4a'
}

export function streamJobTurn(
  jobId: string,
  input: JobTurnInput,
  callbacks: StreamCallbacks,
): StreamHandle {
  return streamSSE(`${API_BASE}/jobs/${jobId}/turns`, buildJobTurnFormData(input), callbacks);
}

async function buildJobTurnFormData(input: JobTurnInput): Promise<FormData> {
  const formData = new FormData();
  await appendUriFile(formData, 'frame', input.photoUri, 'frame.jpg', 'image/jpeg', input.photoFile);
  if (input.question) {
    formData.append('question', input.question);
  }
  if (input.audioUri) {
    await appendUriFile(
      formData,
      'audio',
      input.audioUri,
      'voice.m4a',
      input.audioMime ?? 'audio/m4a',
      input.audioFile,
    );
  }
  return formData;
}

async function appendUriFile(
  formData: FormData,
  field: string,
  uri: string,
  name: string,
  type: string,
  file?: Blob,
): Promise<void> {
  if (usesBrowserFormData()) {
    if (file) {
      formData.append(field, file, file instanceof File && file.name ? file.name : name);
      return;
    }
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Could not read ${field} file: ${response.status}`);
    }
    const blob = await response.blob();
    const typedBlob = blob.type ? blob : new Blob([blob], { type });
    formData.append(field, typedBlob, name);
    return;
  }

  formData.append(field, { uri, name, type } as any);
}

function usesBrowserFormData(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.product !== 'ReactNative'
  );
}
