import { describe, expect, it } from 'vitest';

import { demoShop } from '@act/domain';

import { applyDemoOverrides, isReadinessLevel } from '../levels';
import { demoReadiness } from '../readiness';
import { rosterFromEnv } from '../roster';

const now = new Date('2026-09-05T12:00:00.000Z');

describe('demo level overrides', () => {
  const shop = demoShop(now);
  const maya = shop.techs.find((t) => t.name.startsWith('Maya'))!;

  it('replaces the shop default for that cell only and signs it as the demo manager', () => {
    const levels = applyDemoOverrides(
      shop.levels,
      [{ techId: maya.id, activityId: 'no_heat_furnace', level: 'independent', setAt: now.toISOString(), note: 'ok' }],
      shop.managerId,
    );
    const changed = levels.find((l) => l.techId === maya.id && l.activityId === 'no_heat_furnace');
    expect(changed).toMatchObject({ level: 'independent', setBy: shop.managerId, note: 'ok' });
    expect(levels.filter((l) => l.techId === maya.id && l.activityId === 'no_heat_furnace')).toHaveLength(1);
    expect(levels.length).toBe(shop.levels.length);
  });

  it('a null override clears the cell', () => {
    const levels = applyDemoOverrides(
      shop.levels,
      [{ techId: maya.id, activityId: 'no_heat_furnace', level: null, setAt: now.toISOString(), note: null }],
      shop.managerId,
    );
    expect(levels.find((l) => l.techId === maya.id && l.activityId === 'no_heat_furnace')).toBeUndefined();
  });

  it('setting a level on a flagged cell clears the review flag in the matrix', () => {
    const before = demoReadiness(now);
    const flagged = before.matrix.cells.find((c) => c.reviewSuggested && c.techId === maya.id)!;
    expect(flagged).toBeDefined();
    const after = demoReadiness(now, [
      { techId: maya.id, activityId: flagged.activityId, level: 'supervised', setAt: now.toISOString(), note: null },
    ]);
    const cell = after.matrix.cells.find((c) => c.techId === maya.id && c.activityId === flagged.activityId)!;
    expect(cell.reviewSuggested).toBe(false);
    expect(cell.level?.level).toBe('supervised');
    expect(cell.evidence).toEqual(flagged.evidence);
  });

  it('validates levels', () => {
    expect(isReadinessLevel('mentor')).toBe(true);
    expect(isReadinessLevel('expert')).toBe(false);
    expect(isReadinessLevel(null)).toBe(false);
  });
});

describe('roster from env', () => {
  it('accepts names or objects and ignores garbage', () => {
    const roster = rosterFromEnv('{"a":"Ray Mercado","b":{"name":"Maya Chen","role":"tech"},"c":{"role":"x"},"d":""}');
    expect(roster.get('a')).toEqual({ name: 'Ray Mercado', role: null });
    expect(roster.get('b')).toEqual({ name: 'Maya Chen', role: 'tech' });
    expect(roster.has('c')).toBe(false);
    expect(roster.has('d')).toBe(false);
  });

  it('unset or invalid env is an empty roster, not a crash', () => {
    expect(rosterFromEnv(undefined).size).toBe(0);
    expect(rosterFromEnv('not json').size).toBe(0);
    expect(rosterFromEnv('[1,2]').size).toBe(0);
  });
});
