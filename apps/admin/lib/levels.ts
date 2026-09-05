/**
 * Pure half of the manager-level store: types, validation, and layering a
 * browser's demo decisions over the shop defaults. No Next imports, so the
 * readiness loader and its tests can use it.
 */
import { READINESS_LEVELS, type ReadinessLevel, type ReadinessLevelRecord } from '@act/domain';

export const NOTE_MAX_CHARS = 200;

/** One override per tech × activity. `level: null` clears the shop's default. */
export interface DemoLevelOverride {
  techId: string;
  activityId: string;
  level: ReadinessLevel | null;
  setAt: string;
  note: string | null;
}

export function isReadinessLevel(value: unknown): value is ReadinessLevel {
  return typeof value === 'string' && (READINESS_LEVELS as readonly string[]).includes(value);
}

/** Shop defaults with this browser's decisions layered on top. Pure. */
export function applyDemoOverrides(
  base: ReadinessLevelRecord[],
  overrides: DemoLevelOverride[],
  managerId: string,
): ReadinessLevelRecord[] {
  const key = (techId: string, activityId: string) => `${techId}|${activityId}`;
  const overridden = new Set(overrides.map((o) => key(o.techId, o.activityId)));
  const kept = base.filter((record) => !overridden.has(key(record.techId, record.activityId)));
  const added = overrides
    .filter((o): o is DemoLevelOverride & { level: ReadinessLevel } => o.level != null)
    .map((o) => ({
      techId: o.techId,
      activityId: o.activityId,
      level: o.level,
      setBy: managerId,
      setAt: o.setAt,
      note: o.note,
    }));
  return [...kept, ...added];
}
