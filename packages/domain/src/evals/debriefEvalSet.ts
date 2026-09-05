/**
 * Eval set for the debrief and compile path.
 *
 * Plain data on purpose: act-api runs the real compile, and these cases are
 * meant to be ported there verbatim. Each case names the failure it guards
 * against. The first answer case is the 2026-07-31 incident.
 */
import type { CaseGap } from '../completeness';
import type { EpisodeType } from '../episode';
import type { AnswerRejectReason, EvidenceSource } from '../grounding';
import type { CaseDraft } from '../interview';

export interface NextGapCase {
  name: string;
  draft: CaseDraft;
  episodeType?: EpisodeType;
  /** null means the debrief is complete and no question may be asked. */
  expectGap: CaseGap | null;
  expectQuestionMatches?: RegExp;
}

export interface AnswerCase {
  name: string;
  question: string;
  answer: string;
  momentMeta: string[];
  expectReject: AnswerRejectReason | null;
}

export interface GroundingCase {
  name: string;
  claimId: string;
  claim: string;
  sources: EvidenceSource[];
  expectGrounded: boolean;
}

const CUE_Q = 'What did you notice that made you stop following the obvious path?';
const CALLBACK_CUE_Q =
  'What cue or test was missed on the first visit that would have prevented this callback?';

const INCIDENT_META = ['measurement_threshold', '04:12', '04:31', 'score 0.82', 'teachable'];

export const NEXT_GAP_CASES: NextGapCase[] = [
  {
    name: 'empty draft asks for the cue first',
    draft: {},
    expectGap: 'cue',
  },
  {
    name: 'callback episode asks the callback-shaped cue question',
    draft: {},
    episodeType: 'callback',
    expectGap: 'cue',
    expectQuestionMatches: /prevented this callback/,
  },
  {
    name: 'near miss asks for the stop trigger when boundary is the gap',
    draft: {
      cues: 'Meter showed 240 VDC on the capacitor two minutes after power off.',
      hypotheses: [{ label: 'Stalled fan left no discharge path.', support: [], refute: [] }],
      discriminatingTest: 'Discharge through a resistor tool and re-meter.',
      expertReasoning: 'Pulling the disconnect stops new power; it does not empty the capacitor.',
    },
    episodeType: 'near_miss',
    expectGap: 'boundary',
    expectQuestionMatches: /stop or escalation/,
  },
  {
    name: 'does not ask about a field that is already filled',
    draft: { cues: 'Suction line frosted back to the compressor.' },
    expectGap: 'hypothesis',
  },
  {
    name: 'expert reasoning alone satisfies hypothesis but not causal link order',
    draft: {
      cues: 'Frost plus weak return.',
      expertReasoning: 'Restriction mimics low charge.',
    },
    expectGap: 'discriminating_test',
  },
  {
    name: 'complete draft asks nothing',
    draft: {
      cues: 'Weak return.',
      hypotheses: [{ label: 'restriction', support: [], refute: [] }],
      discriminatingTest: 'Measure static.',
      expertReasoning: 'Restriction mimics low charge.',
      safetyBoundary: 'Isolate power first.',
      verification: 'Split back in spec.',
      noviceTrap: 'Add refrigerant first.',
    },
    expectGap: null,
  },
  {
    name: 'whitespace is not an answer',
    draft: { cues: '   ', expertReasoning: '\n' },
    expectGap: 'cue',
  },
];

export const ANSWER_CASES: AnswerCase[] = [
  {
    name: 'INCIDENT 2026-07-31: moment metadata echoed back as the expert answer',
    question: CUE_Q,
    answer: 'measurement_threshold 04:12–04:31 score 0.82',
    momentMeta: INCIDENT_META,
    expectReject: 'answer_is_metadata',
  },
  {
    name: 'metadata dressed as a sentence is still metadata',
    question: CUE_Q,
    answer: 'Teachable measurement threshold at 04:12 to 04:31.',
    momentMeta: INCIDENT_META,
    expectReject: 'answer_is_metadata',
  },
  {
    name: 'the question repeated back is not an answer',
    question: CUE_Q,
    answer: 'I noticed something that made me stop following the obvious path.',
    momentMeta: INCIDENT_META,
    expectReject: 'answer_echoes_prompt',
  },
  {
    name: 'callback question repeated back',
    question: CALLBACK_CUE_Q,
    answer: 'A cue was missed on the first visit that would have prevented the callback.',
    momentMeta: [],
    expectReject: 'answer_echoes_prompt',
  },
  {
    name: 'one word is not an answer',
    question: CUE_Q,
    answer: 'Frost.',
    momentMeta: INCIDENT_META,
    expectReject: 'empty_answer',
  },
  {
    name: 'a real cue answer is accepted',
    question: CUE_Q,
    answer:
      'Suction line frosted back to the compressor within ten minutes and the return grille barely moved a tissue.',
    momentMeta: INCIDENT_META,
    expectReject: null,
  },
  {
    name: 'a short but specific answer is accepted',
    question: 'Which test would most quickly separate those possibilities?',
    answer: 'Total external static before the gauges go on.',
    momentMeta: INCIDENT_META,
    expectReject: null,
  },
  {
    name: 'an answer that reuses some question words but adds content is accepted',
    question: 'What did you check after the repair to prove the fault was gone?',
    answer: 'After the repair I checked static, split, and subcooling through a full 15-minute cycle.',
    momentMeta: [],
    expectReject: null,
  },
];

const AIRFLOW_SOURCES: EvidenceSource[] = [
  {
    id: 'seg-1',
    kind: 'transcript',
    text: "Hold on. Look at that suction line, it's frosted all the way back to the compressor.",
  },
  {
    id: 'seg-2',
    kind: 'transcript',
    text: "Grille's barely moving. Filter's clean though, she said she changed it after the last guy.",
  },
  {
    id: 'ans-1',
    kind: 'expert_answer',
    text: 'Frost plus a weak return says the evaporator is starving for air, not for refrigerant. I measure total external static before I touch the gauges.',
  },
];

export const GROUNDING_CASES: GroundingCase[] = [
  {
    name: 'claim paraphrased from the transcript is grounded',
    claimId: 'cue',
    claim: 'Suction line frosted back to the compressor; return grille barely moving; filter clean.',
    sources: AIRFLOW_SOURCES,
    expectGrounded: true,
  },
  {
    name: 'claim taken from the expert answer is grounded',
    claimId: 'reasoning',
    claim: 'Frost plus a weak return means the evaporator is starving for air, not refrigerant.',
    sources: AIRFLOW_SOURCES,
    expectGrounded: true,
  },
  {
    name: 'a plausible HVAC claim nobody said is not grounded',
    claimId: 'decision',
    claim: 'Replaced the compressor contactor and recharged the system with two pounds of R-410A.',
    sources: AIRFLOW_SOURCES,
    expectGrounded: false,
  },
  {
    name: 'a safety line the expert never gave is not grounded',
    claimId: 'safety',
    claim: 'Lock out the disconnect and discharge the capacitor before opening the panel.',
    sources: AIRFLOW_SOURCES,
    expectGrounded: false,
  },
  {
    name: 'no sources grounds nothing',
    claimId: 'cue',
    claim: 'Suction line frosted back to the compressor.',
    sources: [],
    expectGrounded: false,
  },
  {
    name: 'one shared word is not grounding',
    claimId: 'verification',
    claim: 'Compressor amps back within nameplate after the new start capacitor.',
    sources: AIRFLOW_SOURCES,
    expectGrounded: false,
  },
];

export const DEBRIEF_EVAL_SET = {
  nextGap: NEXT_GAP_CASES,
  answers: ANSWER_CASES,
  grounding: GROUNDING_CASES,
};
