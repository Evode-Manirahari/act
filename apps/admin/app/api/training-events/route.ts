import { NextResponse } from 'next/server';

import { isDemoId } from '@act/domain';

import { api } from '@/lib/api';

const ALLOWED_EVENT_TYPES = new Set(['quiz_attempted', 'completed', 'viewed']);

/**
 * Records a practice event for the act-api user this server signs in as.
 * The browser sends the case id, event type, and note. It never sends a
 * user id; that comes from /me on the server's own token.
 */
export async function POST(request: Request) {
  let body: { knowledge_object_id?: unknown; event_type?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse('invalid JSON', { status: 400 });
  }
  const caseId = typeof body.knowledge_object_id === 'string' ? body.knowledge_object_id : '';
  const eventType = typeof body.event_type === 'string' ? body.event_type : '';
  const note = typeof body.note === 'string' ? body.note : null;

  if (!caseId || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return new NextResponse('knowledge_object_id and a known event_type are required', { status: 400 });
  }
  // Demo cases do not exist in act-api and must never become rows there.
  if (isDemoId(caseId)) {
    return new NextResponse('demo cases are not recorded', { status: 422 });
  }

  try {
    const me = await api.me();
    const result = await api.logTrainingEvent({
      knowledge_object_id: caseId,
      user_id: me.user_id,
      event_type: eventType,
      note,
    });
    return NextResponse.json(result);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'training event failed', {
      status: 502,
    });
  }
}
