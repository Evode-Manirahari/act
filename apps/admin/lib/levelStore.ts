/**
 * Where a manager's level decision goes.
 *
 * Demo ids: a signed-shape httpOnly cookie on this browser, so the demo loop
 * closes (set a level, the matrix updates, the review flag clears, it
 * survives a refresh) without any write to act-api. Nothing here can leak into
 * production data: the store refuses non-demo ids, and act-api never sees it.
 *
 * Live ids: forwarded to act-api's `/readiness/levels` — the contract in
 * docs/act-api-handoff.md. Until that endpoint exists the forward answers
 * 501 with the reason, and the UI says the decision was not saved.
 */
import { cookies } from 'next/headers';

import { isDemoId, type ReadinessLevel } from '@act/domain';

import { NOTE_MAX_CHARS, isReadinessLevel, type DemoLevelOverride } from './levels';

const COOKIE = 'act_demo_levels';
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

function parseOverrides(raw: string | undefined): DemoLevelOverride[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DemoLevelOverride =>
        typeof item === 'object' &&
        item !== null &&
        isDemoId((item as DemoLevelOverride).techId) &&
        typeof (item as DemoLevelOverride).activityId === 'string' &&
        ((item as DemoLevelOverride).level === null || isReadinessLevel((item as DemoLevelOverride).level)) &&
        typeof (item as DemoLevelOverride).setAt === 'string',
    );
  } catch {
    return [];
  }
}

export async function readDemoOverrides(): Promise<DemoLevelOverride[]> {
  const jar = await cookies();
  return parseOverrides(jar.get(COOKIE)?.value);
}

export async function writeDemoOverride(
  input: { techId: string; activityId: string; level: ReadinessLevel | null; note: string | null },
  now: Date = new Date(),
): Promise<DemoLevelOverride> {
  if (!isDemoId(input.techId)) {
    throw new Error('demo level store accepts demo ids only');
  }
  const jar = await cookies();
  const existing = parseOverrides(jar.get(COOKIE)?.value).filter(
    (o) => !(o.techId === input.techId && o.activityId === input.activityId),
  );
  const override: DemoLevelOverride = {
    techId: input.techId,
    activityId: input.activityId,
    level: input.level,
    setAt: now.toISOString(),
    note: input.note ? input.note.slice(0, NOTE_MAX_CHARS) : null,
  };
  jar.set(COOKIE, JSON.stringify([...existing, override]), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_S,
  });
  return override;
}
