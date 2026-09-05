import { NextResponse } from 'next/server';

import { isDemoId } from '@act/domain';

import { api } from '@/lib/api';
import { NOTE_MAX_CHARS, isReadinessLevel } from '@/lib/levels';
import { writeDemoOverride } from '@/lib/levelStore';

/**
 * A manager sets a level. Same request shape as act-api's /readiness/levels
 * (docs/act-api-handoff.md); the browser never sends who is setting it.
 *
 * Demo tech ids land in this browser's cookie and nowhere else. Live ids are
 * forwarded; until act-api ships the endpoint that forward answers 501.
 */
export async function POST(request: Request) {
  let body: { tech_user_id?: unknown; activity_id?: unknown; level?: unknown; note?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new NextResponse('invalid JSON', { status: 400 });
  }
  const techId = typeof body.tech_user_id === 'string' ? body.tech_user_id : '';
  const activityId = typeof body.activity_id === 'string' ? body.activity_id : '';
  const level = body.level === null || body.level === '' ? null : body.level;
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, NOTE_MAX_CHARS) : null;

  if (!techId || !activityId) {
    return new NextResponse('tech_user_id and activity_id are required', { status: 400 });
  }
  if (level !== null && !isReadinessLevel(level)) {
    return new NextResponse('level must be observe, assist, supervised, independent, mentor, or null', {
      status: 400,
    });
  }

  if (isDemoId(techId)) {
    const saved = await writeDemoOverride({ techId, activityId, level, note });
    return NextResponse.json({ stored: 'browser', ...saved });
  }

  try {
    const saved = await api.setReadinessLevel({
      tech_user_id: techId,
      activity_id: activityId,
      level,
      note,
    });
    return NextResponse.json({ stored: 'act-api', ...saved });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'save failed';
    if (/ -> 404:/.test(message)) {
      return new NextResponse(
        'act-api has no /readiness/levels yet (docs/act-api-handoff.md). The decision was not saved.',
        { status: 501 },
      );
    }
    return new NextResponse(message, { status: 502 });
  }
}
