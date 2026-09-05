import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEBRIEF_EVAL_SET } from '../evals/debriefEvalSet';

/**
 * The eval set is handed to act-api as JSON (docs/act-api-handoff/). This
 * test keeps that file identical to the TypeScript fixtures. Regenerate with
 *   UPDATE_EVAL_JSON=1 pnpm --filter @act/domain test -- evalExport
 */
const OUT = resolve(__dirname, '../../../../docs/act-api-handoff/debrief_eval_set.json');

function serializable() {
  return {
    _source: 'packages/domain/src/evals/debriefEvalSet.ts',
    _rules: {
      nextGap: 'nextDebriefQuestion(draft, episodeType).gap must equal expectGap (null = no question).',
      answers: 'answerRejectReason(answer, question, momentMeta) must equal expectReject.',
      grounding: 'groundClaim(claimId, claim, sources).grounded must equal expectGrounded.',
    },
    nextGap: DEBRIEF_EVAL_SET.nextGap.map((c) => ({
      ...c,
      expectQuestionMatches: c.expectQuestionMatches?.source ?? null,
    })),
    answers: DEBRIEF_EVAL_SET.answers,
    grounding: DEBRIEF_EVAL_SET.grounding,
  };
}

test('docs/act-api-handoff/debrief_eval_set.json matches the fixtures', () => {
  const expected = JSON.stringify(serializable(), null, 2) + '\n';
  if (process.env.UPDATE_EVAL_JSON === '1') {
    writeFileSync(OUT, expected);
  }
  let actual = '';
  try {
    actual = readFileSync(OUT, 'utf8');
  } catch {
    // fall through: a missing file is a mismatch
  }
  expect(actual).toBe(expected);
});
