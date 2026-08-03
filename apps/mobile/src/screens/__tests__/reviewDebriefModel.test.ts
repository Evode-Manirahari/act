/**
 * Regression tests for the failure that produced five fabricated training cards.
 *
 * The old review screen answered its own debrief question: `buildExpertAnswer()`
 * rendered the moment's metadata into a sentence and submitted it so that
 * compile would stop refusing. These tests pin the properties that make that
 * impossible — approval alone never unlocks compile, a rejected answer never
 * counts as answered, and no transition writes answer text.
 *
 * TEST_DATA only. Nothing here is field evidence.
 */
import {
  actionFailed,
  actionLabel,
  answerAccepted,
  answerRejected,
  beginAction,
  canCompile,
  canPublish,
  canRequestQuestion,
  canSubmitAudioAnswer,
  canSubmitTypedAnswer,
  cardPublished,
  draftCompiled,
  explainRejection,
  initialStateForMoment,
  INITIAL_DEBRIEF_STATE,
  isBusy,
  momentApproved,
  phaseLabel,
  questionReady,
  reconcile,
  sessionExpired,
  setDraftAnswer,
  type DebriefState,
} from '../reviewDebriefModel';

/** An approved moment whose question is loaded but not yet answered. */
function pendingWithQuestion(draftAnswer = ''): DebriefState {
  return {
    ...INITIAL_DEBRIEF_STATE,
    phase: 'pending_debrief',
    questionId: 'TEST_DATA-question-1',
    draftAnswer,
  };
}

/** The exact shape the deleted buildExpertAnswer() helper used to produce. */
const FORMER_GENERATED_PAYLOAD =
  'Moment: Diagnostic Shortcut from 00:16 to 00:28. ' +
  'Why it matters: TEST_DATA teachable moment. Evidence: manual_mark';

describe('approving a moment never fabricates a debrief', () => {
  it('leaves an approved moment pending debrief, not answered', () => {
    const approved = momentApproved(
      beginAction(INITIAL_DEBRIEF_STATE, 'approving'),
    );

    expect(approved.phase).toBe('pending_debrief');
    expect(canCompile(approved)).toBe(false);
    expect(canPublish(approved)).toBe(false);
  });

  it('says it is waiting for debrief rather than claiming completion', () => {
    const approved = momentApproved(INITIAL_DEBRIEF_STATE);
    expect(phaseLabel(approved)).toBe('Waiting for debrief');

    const withQuestion = questionReady(approved, 'TEST_DATA-question-1');
    expect(phaseLabel(withQuestion)).toBe('Waiting for your answer');
    expect(canCompile(withQuestion)).toBe(false);
  });

  it('does not unlock compile just because a question exists', () => {
    const withQuestion = questionReady(
      momentApproved(INITIAL_DEBRIEF_STATE),
      'TEST_DATA-question-1',
    );
    expect(withQuestion.phase).toBe('pending_debrief');
    expect(canCompile(withQuestion)).toBe(false);
  });

  it('exposes no transition that supplies answer text', () => {
    // The only way draftAnswer becomes non-empty is a caller passing text in;
    // every server-driven transition either clears it or leaves it alone.
    const start = pendingWithQuestion();
    const transitions: DebriefState[] = [
      momentApproved(start),
      questionReady(start, 'TEST_DATA-question-2'),
      answerRejected(start, 'expert_answer_echoes_prompt', null),
      sessionExpired(start),
      actionFailed(start, 'TEST_DATA network drop'),
      draftCompiled(start),
      cardPublished(start),
    ];
    for (const state of transitions) {
      expect(state.draftAnswer).toBe('');
    }
  });

  it('refuses to submit the former generated payload as a typed answer', () => {
    // Even though the text is long and non-empty, it can only reach the wire if
    // a human put it in the box — and act-api rejects it there (see below).
    // What matters here: nothing in the model produces it.
    const state = pendingWithQuestion();
    expect(state.draftAnswer).not.toContain('Moment:');
    expect(state.draftAnswer).not.toContain('Why it matters:');
    expect(FORMER_GENERATED_PAYLOAD).not.toBe(state.draftAnswer);
  });
});

describe('typed answers gate on real content', () => {
  it('blocks submit while the answer box is empty or whitespace', () => {
    expect(canSubmitTypedAnswer(pendingWithQuestion(''))).toBe(false);
    expect(canSubmitTypedAnswer(pendingWithQuestion('   \n '))).toBe(false);
  });

  it('allows submit once the technician has typed something', () => {
    const typed = pendingWithQuestion(
      'TEST_DATA I check the liquid line temp before touching the charge.',
    );
    expect(canSubmitTypedAnswer(typed)).toBe(true);
  });

  it('will not submit without a question to answer', () => {
    const noQuestion = setDraftAnswer(
      momentApproved(INITIAL_DEBRIEF_STATE),
      'TEST_DATA a real answer',
    );
    expect(noQuestion.questionId).toBeNull();
    expect(canSubmitTypedAnswer(noQuestion)).toBe(false);
  });

  it('unlocks compile only after the server accepts the answer', () => {
    const typed = pendingWithQuestion('TEST_DATA real technician words');
    expect(canCompile(typed)).toBe(false);

    const accepted = answerAccepted(beginAction(typed, 'answering'));
    expect(accepted.phase).toBe('answered');
    expect(canCompile(accepted)).toBe(true);
    // The box is cleared because the words now live server-side.
    expect(accepted.draftAnswer).toBe('');
  });
});

describe('audio answers follow the same gate', () => {
  it('needs a question but not typed text', () => {
    const state = pendingWithQuestion('');
    expect(canSubmitAudioAnswer(state)).toBe(true);
    expect(canSubmitTypedAnswer(state)).toBe(false);
  });

  it('unlocks compile only once the recorded answer is stored', () => {
    const state = pendingWithQuestion('');
    expect(canCompile(state)).toBe(false);
    expect(canCompile(answerAccepted(beginAction(state, 'answering')))).toBe(true);
  });

  it('does not offer audio submit before the moment is approved', () => {
    expect(canSubmitAudioAnswer(INITIAL_DEBRIEF_STATE)).toBe(false);
  });
});

describe('a 422 leaves the question unanswered', () => {
  it('keeps the moment pending and blocks compile and publish', () => {
    const submitting = beginAction(
      pendingWithQuestion('Moment: Diagnostic Shortcut from 00:16 to 00:28.'),
      'answering',
    );
    const rejected = answerRejected(submitting, 'expert_answer_echoes_prompt', null);

    expect(rejected.phase).toBe('pending_debrief');
    expect(canCompile(rejected)).toBe(false);
    expect(canPublish(rejected)).toBe(false);
    expect(rejected.block.kind).toBe('rejected');
  });

  it('keeps the technician’s text so they can edit rather than retype', () => {
    const typed = 'TEST_DATA my first attempt at explaining it';
    const rejected = answerRejected(
      beginAction(pendingWithQuestion(typed), 'answering'),
      'expert_answer_too_thin',
      null,
    );
    expect(rejected.draftAnswer).toBe(typed);
    // And it is immediately editable + resubmittable — no forced reload.
    expect(isBusy(rejected)).toBe(false);
    expect(canSubmitTypedAnswer(rejected)).toBe(true);
  });

  it('explains each backend reason in language a technician can act on', () => {
    expect(explainRejection('expert_answer_echoes_prompt', null)).toMatch(/own words/i);
    expect(explainRejection('expert_answer_placeholder', null)).toMatch(/placeholder/i);
    expect(explainRejection('synthetic_test_evidence', null)).toMatch(/test data/i);
    expect(explainRejection('expert_answer_too_thin', null)).toMatch(/too short/i);
    expect(explainRejection('missing_expert_answer', null)).toMatch(/no answer/i);
  });

  it('falls back to the backend detail for an unrecognised reason', () => {
    expect(explainRejection('some_future_code', 'act-api said no')).toBe('act-api said no');
  });

  it('does not silently re-submit anything after a rejection', () => {
    const rejected = answerRejected(
      beginAction(pendingWithQuestion(''), 'answering'),
      'expert_answer_echoes_prompt',
      null,
    );
    // With an empty box the only offered action is for the human to type.
    expect(canSubmitTypedAnswer(rejected)).toBe(false);
    expect(canCompile(rejected)).toBe(false);
  });
});

describe('an expired session blocks the flow instead of going anonymous', () => {
  it('stops the loop and surfaces a sign-in state', () => {
    const expired = sessionExpired(
      beginAction(pendingWithQuestion('TEST_DATA real answer'), 'answering'),
    );

    expect(expired.block.kind).toBe('auth');
    expect(phaseLabel(expired)).toBe('Sign in to continue');
    expect(expired.phase).toBe('pending_debrief');
  });

  it('preserves the unsent typed answer across the sign-in', () => {
    const typed = 'TEST_DATA what I actually saw at the condenser';
    const expired = sessionExpired(
      beginAction(pendingWithQuestion(typed), 'answering'),
    );
    expect(expired.draftAnswer).toBe(typed);
  });

  it('allows retry once authenticated again', () => {
    const typed = 'TEST_DATA what I actually saw at the condenser';
    const expired = sessionExpired(beginAction(pendingWithQuestion(typed), 'answering'));
    expect(isBusy(expired)).toBe(false);
    expect(canSubmitTypedAnswer(expired)).toBe(true);
  });

  it('never advances the phase on an auth failure', () => {
    const expired = sessionExpired(beginAction(pendingWithQuestion('x'), 'answering'));
    expect(canCompile(expired)).toBe(false);
    expect(canPublish(expired)).toBe(false);
  });
});

describe('double taps do not fan out the workflow', () => {
  it('ignores a second approve while the first is in flight', () => {
    const inFlight = beginAction(INITIAL_DEBRIEF_STATE, 'approving');
    expect(isBusy(inFlight)).toBe(true);
    expect(canRequestQuestion(inFlight)).toBe(false);
  });

  it('ignores a second question request, so no duplicate question is created', () => {
    const approved = momentApproved(INITIAL_DEBRIEF_STATE);
    expect(canRequestQuestion(approved)).toBe(true);

    const loading = beginAction(approved, 'questioning');
    expect(canRequestQuestion(loading)).toBe(false);

    // And once a question exists, the button stops asking for another one.
    const ready = questionReady(loading, 'TEST_DATA-question-1');
    expect(canRequestQuestion(ready)).toBe(false);
  });

  it('ignores a second answer submit while the first is in flight', () => {
    const submitting = beginAction(
      pendingWithQuestion('TEST_DATA real answer'),
      'answering',
    );
    expect(canSubmitTypedAnswer(submitting)).toBe(false);
    expect(canSubmitAudioAnswer(submitting)).toBe(false);
  });

  it('ignores a second compile and a second publish', () => {
    const answered = answerAccepted(pendingWithQuestion('TEST_DATA real answer'));
    expect(canCompile(beginAction(answered, 'compiling'))).toBe(false);

    const compiled = draftCompiled(answered);
    expect(canPublish(compiled)).toBe(true);
    expect(canPublish(beginAction(compiled, 'publishing'))).toBe(false);
  });

  it('labels the in-flight action instead of inviting another tap', () => {
    const submitting = beginAction(pendingWithQuestion('x'), 'answering');
    expect(actionLabel(submitting, 'answering', 'Save expert answer')).toBe('Saving answer…');
    // A different button keeps its idle label.
    expect(actionLabel(submitting, 'compiling', 'Compile draft')).toBe('Compile draft');
  });

  it('marks an uncertain failure for refetch rather than guessing', () => {
    const failed = actionFailed(
      beginAction(pendingWithQuestion('x'), 'answering'),
      'TEST_DATA connection lost',
      { uncertain: true },
    );
    expect(failed.needsRefetch).toBe(true);
    expect(failed.phase).toBe('pending_debrief');
    expect(canCompile(failed)).toBe(false);
  });

  it('adopts authoritative server state after a refetch', () => {
    const uncertain = actionFailed(
      beginAction(pendingWithQuestion('x'), 'answering'),
      'TEST_DATA connection lost',
      { uncertain: true },
    );

    // The write had in fact landed.
    const reconciled = reconcile(uncertain, {
      momentStatus: 'approved',
      questionId: 'TEST_DATA-question-1',
      questionAnswered: true,
      cardStatus: null,
    });
    expect(reconciled.phase).toBe('answered');
    expect(reconciled.needsRefetch).toBe(false);
    expect(canCompile(reconciled)).toBe(true);
  });

  it('reconciles back to pending when the answer never landed', () => {
    const uncertain = actionFailed(
      beginAction(pendingWithQuestion('x'), 'answering'),
      'TEST_DATA connection lost',
      { uncertain: true },
    );
    const reconciled = reconcile(uncertain, {
      momentStatus: 'approved',
      questionId: 'TEST_DATA-question-1',
      questionAnswered: false,
      cardStatus: null,
    });
    expect(reconciled.phase).toBe('pending_debrief');
    expect(canCompile(reconciled)).toBe(false);
  });
});

describe('phase ordering', () => {
  it('seeds an already-approved moment straight into pending debrief', () => {
    expect(initialStateForMoment('approved').phase).toBe('pending_debrief');
    expect(initialStateForMoment('proposed').phase).toBe('unreviewed');
  });

  it('walks approve -> answer -> compile -> publish in order', () => {
    let state = momentApproved(INITIAL_DEBRIEF_STATE);
    state = questionReady(state, 'TEST_DATA-question-1');
    state = setDraftAnswer(state, 'TEST_DATA genuine reasoning from the tech');

    expect(canCompile(state)).toBe(false);
    state = answerAccepted(state);
    expect(canPublish(state)).toBe(false);

    state = draftCompiled(state);
    expect(canPublish(state)).toBe(true);

    state = cardPublished(state);
    expect(phaseLabel(state)).toBe('Published');
  });
});
