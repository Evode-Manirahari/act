import { diagnosticCaseFromKnowledgeObject } from '../case';
import {
  emptyLedger,
  hiddenJudgment,
  medianDebriefMinutes,
  mixReady,
  PILOT0_SLOT_SPECS,
  scoreHypothesis,
} from '../pilot0';

describe('Pilot 0 mix and thresholds', () => {
  it('starts empty and does not treat empty as a pass', () => {
    const ledger = emptyLedger();
    expect(mixReady(ledger)).toBe(false);
    expect(PILOT0_SLOT_SPECS).toHaveLength(5);
    expect(scoreHypothesis(ledger, 'senior_workflow')).toBe('pending');
    expect(scoreHypothesis(ledger, 'hidden_judgment')).toBe('pending');
    expect(scoreHypothesis(ledger, 'manager_action')).toBe('pending');
  });

  it('requires the five episode slots, not five callbacks', () => {
    const ledger = emptyLedger();
    for (const spec of PILOT0_SLOT_SPECS) {
      ledger.slots[spec.id].momentId = `m-${spec.id}`;
    }
    expect(mixReady(ledger)).toBe(true);
  });

  it('passes senior workflow only when median debrief is ≤7 and both will repeat', () => {
    const ledger = emptyLedger();
    for (const spec of PILOT0_SLOT_SPECS) {
      ledger.slots[spec.id].momentId = `m-${spec.id}`;
      ledger.slots[spec.id].debriefMinutes = 6;
      ledger.slots[spec.id].willingToRepeat = true;
    }
    expect(medianDebriefMinutes(ledger)).toBe(6);
    expect(scoreHypothesis(ledger, 'senior_workflow')).toBe('pass');
    for (const spec of PILOT0_SLOT_SPECS) {
      ledger.slots[spec.id].debriefMinutes = 10;
    }
    expect(scoreHypothesis(ledger, 'senior_workflow')).toBe('fail');
  });

  it('passes hidden judgment at 4 of 5, and does not invent a work-order comparison', () => {
    expect(hiddenJudgment('Frost plus a weak return means airflow not charge.', null)).toBeNull();
    expect(hiddenJudgment('Replaced filter.', 'Replaced filter per work order.')).toBe(false);
    expect(
      hiddenJudgment(
        'The evaporator is starving for air; static was 1.1 before the gauges went on.',
        'No cool. Customer said replace the capacitor.',
      ),
    ).toBe(true);

    const ledger = emptyLedger();
    for (const spec of PILOT0_SLOT_SPECS) {
      ledger.slots[spec.id].momentId = `m-${spec.id}`;
      ledger.slots[spec.id].hiddenJudgment = true;
    }
    ledger.slots['adaptation'].hiddenJudgment = false;
    expect(scoreHypothesis(ledger, 'hidden_judgment')).toBe('pass');
    ledger.slots['hard_solve'].hiddenJudgment = false;
    expect(scoreHypothesis(ledger, 'hidden_judgment')).toBe('fail');
  });

  it('fails the manager hypothesis on an explicit no-change', () => {
    const ledger = emptyLedger();
    expect(scoreHypothesis(ledger, 'manager_action')).toBe('pending');
    ledger.managerAction = 'No change this week.';
    expect(scoreHypothesis(ledger, 'manager_action')).toBe('fail');
    ledger.managerAction = 'Jay rides with Sam on no-cool calls until the variant is done.';
    expect(scoreHypothesis(ledger, 'manager_action')).toBe('pass');
  });

  it('maps a card without inventing a work order', () => {
    const diag = diagnosticCaseFromKnowledgeObject({
      id: 'ko-1',
      moment_id: 'm-1',
      title: 'Airflow',
      trade: 'hvac',
      situation: 'No-cool.',
      observable_cue: 'Weak return.',
      expert_reasoning: 'Restriction mimics low charge.',
      decision: 'Check static.',
      novice_trap: 'Add charge first.',
      safety_boundary: 'Isolate power.',
      verification: 'Split returned.',
      tags_json: ['callback'],
      status: 'draft',
      published_at: null,
      created_at: '2026-09-07T00:00:00.000Z',
    });
    expect(hiddenJudgment(diag.expertReasoning, null)).toBeNull();
  });
});
