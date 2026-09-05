/**
 * The debrief that produced the demo shop's airflow callback case, replayed.
 *
 * Fictional, like the rest of the demo shop. The transcript lines are what a
 * chest camera would have caught; the answers are what Ray said when asked
 * after the job. One deliberately bad answer is included so the demo can show
 * what refusal looks like.
 */
import type { CaseGap } from './completeness';
import type { EvidenceSource } from './grounding';
import type { CaseDraft } from './interview';

export interface DemoDebrief {
  caseId: string;
  episodeType: 'callback';
  /** What the system knew before asking anything. */
  moment: {
    label: string;
    window: string;
    markType: string;
    score: string;
  };
  momentMeta: string[];
  transcript: EvidenceSource[];
  base: CaseDraft;
  answers: Record<CaseGap, string>;
  /** A wrong first answer for the cue question: the incident pattern. */
  badAnswer: string;
}

export const DEMO_DEBRIEF: DemoDebrief = {
  caseId: 'demo-case-airflow-callback',
  episodeType: 'callback',
  moment: {
    label: 'Teachable moment',
    window: '04:12 – 04:31',
    markType: 'measurement_threshold',
    score: '0.82',
  },
  momentMeta: ['teachable moment', '04:12', '04:31', 'measurement_threshold', 'score 0.82'],
  transcript: [
    {
      id: 'demo-seg-1',
      kind: 'transcript',
      text: "Hold on. Look at that suction line. It's frosted all the way back to the compressor.",
    },
    {
      id: 'demo-seg-2',
      kind: 'transcript',
      text: "Grille's barely moving. Filter's clean though. She said she changed it after the last visit.",
    },
    {
      id: 'demo-seg-3',
      kind: 'transcript',
      text: "I'm not putting any gas in this until I see the static. Hand me the manometer.",
    },
    {
      id: 'demo-seg-4',
      kind: 'transcript',
      text: 'Static is 1.1. Blower is rated for 0.5. There is your problem, and it is not the charge.',
    },
  ],
  base: {
    title: 'Frosted suction line was airflow, not low charge',
    presentingProblem:
      'Second visit in nine days on a 3-ton residential split. First visit added a pound of R-410A for a "low charge" call. Customer says it cooled for a week, then stopped again.',
  },
  answers: {
    cue: 'Suction line frosted back to the compressor within ten minutes. Return grille barely moved a tissue. Filter was clean, the homeowner changed it after visit one.',
    hypothesis:
      'A restriction anywhere on the return side gives the same low-suction picture as low charge. Frost plus a weak return says the evaporator is starving for air, not for refrigerant.',
    discriminating_test:
      'Measure total external static before touching the gauges. It read 1.1 in. WC against a 0.5 rated blower.',
    causal_link:
      'Adding charge on visit one masked it. The extra refrigerant lifted suction pressure for a while until the coil iced again. Behind the clean filter the evaporator coil face was matted with dog hair.',
    boundary:
      'Kill power at the disconnect and verify with a meter before opening the blower compartment. Gloves and eye protection when cleaning the coil, fin edges cut.',
    verification:
      'Static back to 0.6 in. WC, 18 to 20 degree split held through a full 15-minute cycle, subcooling within 2 degrees of nameplate. Called the customer at day ten, still cooling.',
    novice_trap:
      'Reading a cold, frosted suction line as proof of low charge. Frost tells you the coil is below freezing. It does not tell you why.',
  },
  badAnswer: 'Teachable moment, measurement threshold, 04:12 to 04:31, score 0.82.',
};
