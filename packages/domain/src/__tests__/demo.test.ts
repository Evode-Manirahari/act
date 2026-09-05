import { canPractice, diagnosticCaseFromKnowledgeObject } from '../case';
import { debriefComplete } from '../completeness';
import { demoShop, isDemoId } from '../demo';
import { buildReadinessMatrix, cellFor, reviewQueue } from '../readiness';
import { variantSchedule } from '../variant';

const now = new Date('2026-09-04T12:00:00.000Z');
const shop = demoShop(now);
const cases = shop.cards.map(diagnosticCaseFromKnowledgeObject);

describe('demo shop', () => {
  it('marks every id as demo so nothing can be mistaken for field evidence', () => {
    const ids = [
      ...shop.techs.map((t) => t.id),
      ...shop.cards.map((c) => c.id),
      ...shop.cards.map((c) => c.moment_id),
      ...shop.events.map((e) => e.id),
      ...shop.jobs.map((j) => j.id),
      shop.managerId,
      shop.learnerId,
    ];
    expect(ids.every(isDemoId)).toBe(true);
    expect(isDemoId('7a1c-real-uuid')).toBe(false);
  });

  it('ships only complete, practicable cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(5);
    for (const diag of cases) {
      expect(canPractice(diag)).toBe(true);
      expect(debriefComplete(diag)).toBe(true);
      expect(diag.status).toBe('published');
    }
    const episodeTypes = new Set(cases.map((diag) => diag.episodeType));
    expect(episodeTypes).toEqual(new Set(['callback', 'hard_solve', 'near_miss', 'adaptation', 'proficiency']));
  });

  it('only references cases and techs that exist', () => {
    const caseIds = new Set(shop.cards.map((c) => c.id));
    const techIds = new Set(shop.techs.map((t) => t.id));
    for (const event of shop.events) {
      expect(caseIds.has(event.caseId)).toBe(true);
      expect(techIds.has(event.userId ?? '')).toBe(true);
    }
    for (const job of shop.jobs) expect(techIds.has(job.userId)).toBe(true);
    for (const level of shop.levels) expect(techIds.has(level.techId)).toBe(true);
  });

  it('puts the learner in every variant state the demo needs to show', () => {
    const byStatus = (caseId: string, userId: string) =>
      variantSchedule(shop.events, caseId, userId, now).status;
    expect(byStatus('demo-case-airflow-callback', shop.learnerId)).toBe('due');
    expect(byStatus('demo-case-flame-sensor', shop.learnerId)).toBe('done');
    expect(byStatus('demo-case-txv-subcooling', shop.learnerId)).toBe('waiting');
    expect(byStatus('demo-case-capacitor-discharge', shop.learnerId)).toBe('not_started');
    expect(byStatus('demo-case-capacitor-discharge', 'demo-tech-jordan')).toBe('overdue');
  });

  it('produces a matrix with manager-set levels and at least one review suggestion', () => {
    const matrix = buildReadinessMatrix({ techs: shop.techs, cases, events: shop.events, jobs: shop.jobs, levels: shop.levels });
    expect(cellFor(matrix, shop.learnerId, 'no_cool_split')?.level?.level).toBe('independent');
    expect(cellFor(matrix, shop.learnerId, 'no_cool_split')?.evidence.callbacks).toBe(1);
    expect(cellFor(matrix, shop.learnerId, 'refrigerant_charge')?.level).toBeNull();
    expect(cellFor(matrix, shop.learnerId, 'refrigerant_charge')?.reviewSuggested).toBe(true);
    expect(reviewQueue(matrix).length).toBeGreaterThan(0);
    for (const level of shop.levels) expect(level.setBy).toBe(shop.managerId);
  });

  it('is deterministic for a fixed clock', () => {
    expect(demoShop(now)).toEqual(demoShop(now));
  });
});
