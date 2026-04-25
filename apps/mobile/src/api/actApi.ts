const API_BASE = 'https://act-api-evode.fly.dev';

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSE(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  for (const block of text.split('\n\n')) {
    if (!block.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
    }
    if (dataLines.length) events.push({ event, data: dataLines.join('\n') });
  }
  return events;
}

export interface DemoTurnResult {
  transcript: string;
  answer: string;
}

export async function demoTurn(photoUri: string, question: string): Promise<DemoTurnResult> {
  const formData = new FormData();
  formData.append('frame', {
    uri: photoUri,
    name: 'frame.jpg',
    type: 'image/jpeg',
  } as any);
  formData.append('question', question);

  const response = await fetch(`${API_BASE}/demo/turn`, {
    method: 'POST',
    body: formData as any,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Server ${response.status}: ${body.slice(0, 200)}`);
  }

  const text = await response.text();
  const events = parseSSE(text);

  const transcript = events.find((e) => e.event === 'transcript')?.data ?? question;
  const answer = events
    .filter((e) => e.event === 'token')
    .map((e) => e.data)
    .join('');

  return { transcript, answer };
}
