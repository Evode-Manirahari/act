import type { PracticeEvent } from '../evidence';
import { variantSchedule, variantsDue } from '../variant';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-01T12:00:00.000Z');
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();

const completed = (daysAgo: number, caseId = 'c1', userId = 'maya'): PracticeEvent => ({
  id: `${caseId}-${daysAgo}`,
  caseId,
  userId,
  eventType: 'completed',
  note: JSON.stringify({ kind: 'hypothesis_committed' }),
  createdAt: at(daysAgo),
});

const variantDone = (daysAgo: number, caseId = 'c1', userId = 'maya'): PracticeEvent => ({
  id: `${caseId}-v-${daysAgo}`,
  caseId,
  userId,
  eventType: 'completed',
  note: JSON.stringify({ kind: 'variant_completed' }),
  createdAt: at(daysAgo),
});

describe('delayed variant schedule', () => {
  it('is not started until a completion exists', () => {
    expect(variantSchedule([], 'c1', 'maya', now).status).toBe('not_started');
  });

  it('waits until day 7, is due through day 14, then overdue', () => {
    expect(variantSchedule([completed(3)], 'c1', 'maya', now).status).toBe('waiting');
    expect(variantSchedule([completed(7)], 'c1', 'maya', now).status).toBe('due');
    expect(variantSchedule([completed(14)], 'c1', 'maya', now).status).toBe('due');
    expect(variantSchedule([completed(15)], 'c1', 'maya', now).status).toBe('overdue');
  });

  it('hangs the window off the first completion, not the latest', () => {
    const schedule = variantSchedule([completed(20), completed(2)], 'c1', 'maya', now);
    expect(schedule.firstCompletedAt).toBe(at(20));
    expect(schedule.status).toBe('overdue');
  });

  it('is done once a variant completion follows the first practice', () => {
    const schedule = variantSchedule([completed(20), variantDone(10)], 'c1', 'maya', now);
    expect(schedule.status).toBe('done');
    expect(schedule.variantCompletedAt).toBe(at(10));
  });

  it('does not count another learner or another case', () => {
    const events = [completed(10, 'c1', 'jordan'), completed(10, 'c2', 'maya')];
    expect(variantSchedule(events, 'c1', 'maya', now).status).toBe('not_started');
  });

  it('lists only due and overdue cases', () => {
    const events = [completed(3, 'c1'), completed(9, 'c2'), completed(30, 'c3'), completed(20, 'c4'), variantDone(9, 'c4')];
    expect(variantsDue(events, ['c1', 'c2', 'c3', 'c4'], 'maya', now).map((s) => s.caseId)).toEqual(['c2', 'c3']);
  });
});
