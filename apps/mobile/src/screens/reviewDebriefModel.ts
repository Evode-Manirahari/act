/**
 * Pure state machine for the post-job debrief loop, extracted for testability
 * (same pattern as debriefModel.ts / learnScreenModel.ts / authGateModel.ts).
 *
 * This module exists because of a specific failure. The review screen used to
 * carry a `buildExpertAnswer()` helper that rendered a moment's own metadata
 * ("Moment: Diagnostic Shortcut from 00:16 to 00:28. Why it matters: …") into a
 * string and POSTed it as the technician's answer, because the backend refused
 * to compile a moment whose question was unanswered. One tap therefore produced
 * an approved moment, an "answered" question, a compiled card and a published
 * card without a person ever saying anything. Five cards were fabricated that
 * way and later deleted.
 *
 * The helper is gone. The rule that replaces it: **a phase may only advance on
 * evidence that arrived from the server**, and the only thing that can move a
 * moment out of `pending_debrief` is a stored answer the backend accepted. The
 * client has no path — none — that writes an answer on the technician's behalf.
 */

/** Where one moment sits in the loop. Strictly ordered. */
export type DebriefPhase =
  | 'unreviewed'      // not approved yet
  | 'pending_debrief' // approved; question drafted or not; no accepted answer
  | 'answered'        // backend stored a real answer
  | 'compiled'        // draft card exists
  | 'published';      // card is live

/** The async step currently in flight, if any. One per moment. */
export type DebriefAction =
  | 'idle'
  | 'approving'
  | 'questioning'
  | 'answering'
  | 'compiling'
  | 'publishing';

/** Why the loop is blocked, when it is. */
export type DebriefBlock =
  | { kind: 'none' }
  | { kind: 'auth'; message: string }
  | { kind: 'rejected'; reason: string | null; message: string }
  | { kind: 'error'; message: string };

export type DebriefState = {
  phase: DebriefPhase;
  action: DebriefAction;
  /** Question id once one exists; null while none has been drafted. */
  questionId: string | null;
  /** The technician's in-progress typed answer. Never generated. */
  draftAnswer: string;
  block: DebriefBlock;
  /** Set when a write's outcome is unknown (network drop mid-flight). */
  needsRefetch: boolean;
};

export const INITIAL_DEBRIEF_STATE: DebriefState = {
  phase: 'unreviewed',
  action: 'idle',
  questionId: null,
  draftAnswer: '',
  block: { kind: 'none' },
  needsRefetch: false,
};

/** A moment already approved server-side starts at pending_debrief. */
export function initialStateForMoment(momentStatus: string): DebriefState {
  return {
    ...INITIAL_DEBRIEF_STATE,
    phase: momentStatus === 'approved' ? 'pending_debrief' : 'unreviewed',
  };
}

const PHASE_ORDER: DebriefPhase[] = [
  'unreviewed',
  'pending_debrief',
  'answered',
  'compiled',
  'published',
];

export function phaseAtLeast(phase: DebriefPhase, floor: DebriefPhase): boolean {
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(floor);
}

// --- Gates -----------------------------------------------------------------
// Every gate is false while an action is in flight, which is what makes a
// double tap a no-op rather than a second request.

export function isBusy(state: DebriefState): boolean {
  return state.action !== 'idle';
}

export function canApprove(state: DebriefState): boolean {
  return !isBusy(state) && state.phase === 'unreviewed';
}

/** Drafting or loading the question requires an approved moment. */
export function canRequestQuestion(state: DebriefState): boolean {
  return !isBusy(state) && state.phase === 'pending_debrief' && state.questionId === null;
}

/**
 * The technician's own words are the only thing that can be submitted, so an
 * empty box means there is nothing to send. There is deliberately no branch
 * here that substitutes moment metadata for a missing answer.
 */
export function canSubmitTypedAnswer(state: DebriefState): boolean {
  return (
    !isBusy(state) &&
    state.phase === 'pending_debrief' &&
    state.questionId !== null &&
    state.draftAnswer.trim().length > 0
  );
}

/** Audio needs a question and a finished recording, not a typed draft. */
export function canSubmitAudioAnswer(state: DebriefState): boolean {
  return !isBusy(state) && state.phase === 'pending_debrief' && state.questionId !== null;
}

/** Compile is unlocked by a stored answer — never by approval alone. */
export function canCompile(state: DebriefState): boolean {
  return !isBusy(state) && state.phase === 'answered';
}

export function canPublish(state: DebriefState): boolean {
  return !isBusy(state) && state.phase === 'compiled';
}

// --- Transitions -----------------------------------------------------------

export function beginAction(state: DebriefState, action: DebriefAction): DebriefState {
  return { ...state, action, block: { kind: 'none' } };
}

export function momentApproved(state: DebriefState): DebriefState {
  return {
    ...state,
    action: 'idle',
    phase: phaseAtLeast(state.phase, 'pending_debrief') ? state.phase : 'pending_debrief',
    needsRefetch: false,
  };
}

export function questionReady(state: DebriefState, questionId: string): DebriefState {
  return { ...state, action: 'idle', questionId, needsRefetch: false };
}

/**
 * Only called after the backend returns 201 for a stored answer. `answered` is
 * a server fact, not a local intention — the previous design set it optimistically
 * and that is how a moment could look debriefed when it was not.
 */
export function answerAccepted(state: DebriefState): DebriefState {
  return {
    ...state,
    action: 'idle',
    phase: 'answered',
    draftAnswer: '',
    block: { kind: 'none' },
    needsRefetch: false,
  };
}

export function draftCompiled(state: DebriefState): DebriefState {
  return { ...state, action: 'idle', phase: 'compiled', needsRefetch: false };
}

export function cardPublished(state: DebriefState): DebriefState {
  return { ...state, action: 'idle', phase: 'published', needsRefetch: false };
}

export function setDraftAnswer(state: DebriefState, text: string): DebriefState {
  return { ...state, draftAnswer: text };
}

/**
 * The backend refused the text as not-human-authored (422).
 *
 * The phase does not move. The question stays open, the typed answer is kept in
 * the box so it can be edited, and compile/publish stay locked. Retrying with
 * anything the app made up is not an option the state machine offers.
 */
export function answerRejected(
  state: DebriefState,
  reason: string | null,
  detail: string | null,
): DebriefState {
  return {
    ...state,
    action: 'idle',
    phase: 'pending_debrief',
    block: { kind: 'rejected', reason, message: explainRejection(reason, detail) },
    needsRefetch: false,
  };
}

/**
 * Session missing or expired. The draft answer is preserved verbatim: the
 * technician typed it, and losing it to re-authentication would teach them not
 * to bother typing a real one.
 */
export function sessionExpired(state: DebriefState, message?: string): DebriefState {
  return {
    ...state,
    action: 'idle',
    block: {
      kind: 'auth',
      message: message ?? 'Your session expired. Sign in again to submit this answer.',
    },
    needsRefetch: false,
  };
}

/**
 * A failure that leaves the write's outcome unknown — the request may or may
 * not have landed. The phase is left alone and the screen is told to refetch
 * authoritative state rather than guess.
 */
export function actionFailed(
  state: DebriefState,
  message: string,
  opts: { uncertain?: boolean } = {},
): DebriefState {
  return {
    ...state,
    action: 'idle',
    block: { kind: 'error', message },
    needsRefetch: Boolean(opts.uncertain),
  };
}

/** Fold authoritative server state back in after a refetch. */
export function reconcile(
  state: DebriefState,
  server: {
    momentStatus: string;
    questionId: string | null;
    questionAnswered: boolean;
    cardStatus: string | null;
  },
): DebriefState {
  let phase: DebriefPhase = 'unreviewed';
  if (server.momentStatus === 'approved') phase = 'pending_debrief';
  if (server.questionAnswered) phase = 'answered';
  if (server.cardStatus) phase = server.cardStatus === 'published' ? 'published' : 'compiled';
  return {
    ...state,
    phase,
    questionId: server.questionId,
    action: 'idle',
    needsRefetch: false,
    // A rejection is about text the technician can still fix; a refetch that
    // confirms the question is still unanswered shouldn't erase that hint.
    block: phase === 'answered' ? { kind: 'none' } : state.block,
  };
}

// --- Copy ------------------------------------------------------------------

/**
 * Turn act-api's reason code into something a technician can act on.
 *
 * The backend's own sentence is fine for a developer but reads as an accusation
 * on a phone in a mechanical room, so each code gets a plain instruction. The
 * raw detail is kept as a fallback for codes added later.
 */
export function explainRejection(reason: string | null, detail: string | null): string {
  switch (reason) {
    case 'expert_answer_echoes_prompt':
      return "That text repeats the question or the moment's own summary. Answer in your own words — what you saw, and what you did about it.";
    case 'expert_answer_placeholder':
      return 'That looks like placeholder text. Write what actually told you to act here.';
    case 'synthetic_test_evidence':
      return 'That text is marked as test data, so it cannot be saved as a real answer.';
    case 'expert_answer_too_thin':
      return 'That answer is too short to build a card from. Add what you noticed and what a newer tech would get wrong.';
    case 'missing_expert_answer':
      return 'No answer was recorded. Type or record your answer, then submit.';
    default:
      return detail ?? 'The backend could not accept that answer. Edit it and try again.';
  }
}

/** One line describing where the moment stands. Never claims work that hasn't happened. */
export function phaseLabel(state: DebriefState): string {
  if (state.block.kind === 'auth') return 'Sign in to continue';
  switch (state.phase) {
    case 'unreviewed':
      return 'Not reviewed yet';
    case 'pending_debrief':
      return state.questionId ? 'Waiting for your answer' : 'Waiting for debrief';
    case 'answered':
      return 'Answer saved · ready to compile';
    case 'compiled':
      return 'Draft card · review before publishing';
    case 'published':
      return 'Published';
  }
}

/** Supporting copy for the pending state, so "waiting" never reads as "done". */
export function phaseHint(state: DebriefState): string | null {
  if (state.block.kind === 'auth') return state.block.message;
  if (state.block.kind === 'rejected') return state.block.message;
  if (state.phase === 'pending_debrief') {
    return state.questionId
      ? 'This moment is not a training card yet. It needs the expert’s own answer first.'
      : 'Approved. Load the debrief question to ask the expert what a newer tech would miss.';
  }
  return null;
}

/** Label for an action button, showing in-flight work instead of inviting a second tap. */
export function actionLabel(
  state: DebriefState,
  action: Exclude<DebriefAction, 'idle'>,
  idleLabel: string,
): string {
  if (state.action !== action) return idleLabel;
  switch (action) {
    case 'approving':
      return 'Approving…';
    case 'questioning':
      return 'Loading question…';
    case 'answering':
      return 'Saving answer…';
    case 'compiling':
      return 'Compiling…';
    case 'publishing':
      return 'Publishing…';
  }
}
