import { describe, expect, it } from 'vitest';

import { isDemoId, reviewQueue } from '@act/domain';

import { demoCardsAsKnowledgeObjects, demoReadiness } from '@/lib/readiness';

const now = new Date('2026-09-04T12:00:00.000Z');

describe('demo readiness', () => {
  it('is labelled demo and never carries a live learner id', () => {
    const data = demoReadiness(now);
    expect(data.source).toBe('demo');
    expect(data.levelsSource).toBe('manager');
    expect(isDemoId(data.learnerId)).toBe(true);
    expect(data.warnings).toEqual([]);
    expect(data.unconfirmedTechs).toEqual([]);
  });

  it('gives the manager something to review on first open', () => {
    const data = demoReadiness(now);
    expect(data.matrix.techs.length).toBe(3);
    expect(data.matrix.activities.length).toBeGreaterThan(3);
    expect(reviewQueue(data.matrix).length).toBeGreaterThan(0);
  });

  it('renders demo cards through the same KnowledgeObjectOut shape as act-api rows', () => {
    const cards = demoCardsAsKnowledgeObjects(now);
    for (const card of cards) {
      expect(isDemoId(card.id)).toBe(true);
      expect(card.status).toBe('published');
      expect(card.quiz_json).toBeNull();
    }
  });
});
