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
  /**
   * The outcome of a write is still unknown (network drop mid-flight).
   *
   * This means only "unresolved" — it is deliberately NOT a request to retry.
   * Scheduling is tracked separately (see debriefReconciler), because a flag
   * that both survives a failed reconciliation *and* triggers one is an
   * unbounded request loop: the failure writes state, the state write triggers
   * the effect, the effect fails again.
   */
  needsRefetch: boolean;
  /**
   * The question read failed, so what we hold about this moment's question may
   * be stale. Blocks anything that would act on it — loading another question,
   * editing it, or answering it — while leaving card-side work alone.
   */
  questionUnconfirmed: boolean;
  /**
   * The card read failed, so we do not know whether a card exists. Blocks
   * compile and publish, which are the non-idempotent operations, while leaving
   * a technician free to answer a question we *did* confirm.
   */
  cardUnconfirmed: boolean;
};

export const INITIAL_DEBRIEF_STATE: DebriefState = {
  phase: 'unreviewed',
  action: 'idle',
  questionId: null,
  draftAnswer: '',
  block: { kind: 'none' },
  needsRefetch: false,
  questionUnconfirmed: false,
  cardUnconfirmed: false,
};

/** True when any read behind this moment's state could not be confirmed. */
export function isUnconfirmed(state: DebriefState): boolean {
  return state.questionUnconfirmed || state.cardUnconfirmed;
}

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

/**
 * Drafting or loading the question requires an approved moment and a question
 * read we trust. Acting on an unconfirmed question read could create a second
 * question for a moment that already has one.
 */
export function canRequestQuestion(state: DebriefState): boolean {
  return (
    !isBusy(state) &&
    !state.questionUnconfirmed &&
    state.phase === 'pending_debrief' &&
    state.questionId === null
  );
}

/**
 * Editing the question text is a write against a specific question row. If we
 * could not confirm which row is current, that edit could land on a stale one.
 */
export function canEditQuestion(state: DebriefState): boolean {
  return !isBusy(state) && !state.questionUnconfirmed && state.phase === 'pending_debrief';
}

/**
 * The technician's own words are the only thing that can be submitted, so an
 * empty box means there is nothing to send. There is deliberately no branch
 * here that substitutes moment metadata for a missing answer.
 */
export function canSubmitTypedAnswer(state: DebriefState): boolean {
  return (
    !isBusy(state) &&
    // An answer is POSTed against a question id. If the question read failed,
    // the id we hold may be stale, so the answer could land on the wrong row.
    !state.questionUnconfirmed &&
    state.phase === 'pending_debrief' &&
    state.questionId !== null &&
    state.draftAnswer.trim().length > 0
  );
}

/** Audio needs a question and a finished recording, not a typed draft. */
export function canSubmitAudioAnswer(state: DebriefState): boolean {
  return (
    !isBusy(state) &&
    !state.questionUnconfirmed &&
    state.phase === 'pending_debrief' &&
    state.questionId !== null
  );
}

/**
 * Compile is unlocked by a stored answer — never by approval alone, and never
 * while server state is unconfirmed. Compile is not idempotent on the backend,
 * so acting on a phase we could not verify risks a second card.
 */
export function canCompile(state: DebriefState): boolean {
  // Only the *card* read matters here: compiling against an unconfirmed card
  // read risks a second KnowledgeObject. A failed question read does not make
  // an already-confirmed `answered` phase wrong.
  return !isBusy(state) && !state.cardUnconfirmed && state.phase === 'answered';
}

export function canPublish(state: DebriefState): boolean {
  return !isBusy(state) && !state.cardUnconfirmed && state.phase === 'compiled';
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
    // `needsRefetch` is deliberately preserved, not cleared. Failing to
    // authenticate tells us nothing about whether an earlier write landed, and
    // clearing it here would silently mark a compile or publish resolved
    // because a *later, unrelated* request was rejected.
    //
    // This is correct in both directions: a write rejected with 401 up front
    // never set the flag, so it stays false; an uncertain write followed by a
    // 401 hydration stays unresolved and gets reconciled after sign-in.
    needsRefetch: state.needsRefetch,
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

/**
 * Fold authoritative server state back in.
 *
 * This is the only function that may move a moment forward without the user
 * having just done something, and it does so strictly from what the server
 * reported. A card outranks the question: once a card exists the moment is
 * compiled or published regardless of how the question row looks, because the
 * card is the artifact the reviewer and apprentice actually see.
 *
 * `draftAnswer` survives untouched — hydrating must never cost the technician
 * text they are part-way through typing. The in-flight `action` also survives,
 * because a refresh landing mid-write must not re-enable the buttons; the
 * single-flight lock is the real mutex, and this keeps the UI agreeing with it.
 */
export function reconcile(
  state: DebriefState,
  server: {
    momentStatus: string;
    /** Omitted when the question read failed — then nothing question-derived applies. */
    question?: { questionId: string | null; answered: boolean };
    /** Omitted when the card read failed — then nothing card-derived applies. */
    card?: { status: string | null };
  },
): DebriefState {
  const questionConfirmed = server.question !== undefined;
  const cardConfirmed = server.card !== undefined;

  // Where each confirmed read says this moment sits, on its own.
  const fromQuestion: DebriefPhase | null = server.question
    ? server.question.answered
      ? 'answered'
      : server.momentStatus === 'approved'
        ? 'pending_debrief'
        : 'unreviewed'
    : null;
  const fromCard: DebriefPhase | null = server.card
    ? server.card.status
      ? server.card.status === 'published'
        ? 'published'
        : 'compiled'
      : null // confirmed: no card exists
    : null;

  let phase = state.phase;
  if (questionConfirmed && cardConfirmed) {
    // Both reads landed — this is the fully authoritative case, and the only
    // one allowed to move the phase anywhere at all.
    phase = fromCard ?? (fromQuestion as DebriefPhase);
  } else if (cardConfirmed) {
    // We know the card truth but not the question truth.
    if (fromCard) {
      phase = fromCard;
    } else if (phaseAtLeast(state.phase, 'compiled')) {
      // Confirmed absence of a card disproves compiled/published. It says
      // nothing about answered, which the failed question read owns, so fall
      // back only as far as that.
      phase = 'answered';
    }
  } else if (questionConfirmed) {
    // We know the question truth but not the card truth. A card we may still
    // have outranks it, so never lower a compiled/published moment here.
    if (!phaseAtLeast(state.phase, 'compiled')) {
      phase = fromQuestion as DebriefPhase;
    }
  }

  const questionUnconfirmed = !questionConfirmed;
  const cardUnconfirmed = !cardConfirmed;
  const fullyConfirmed = questionConfirmed && cardConfirmed;

  return {
    ...state,
    phase,
    // Only a successful question read may change which question we hold.
    questionId: server.question ? server.question.questionId : state.questionId,
    // Resolved only when the whole picture was confirmed. A partial read leaves
    // the write outcome open — but see debriefReconciler: unresolved does not
    // mean "retry now".
    needsRefetch: fullyConfirmed ? false : state.needsRefetch,
    questionUnconfirmed,
    cardUnconfirmed,
    block: nextBlock(state, phase, fullyConfirmed),
  };
}

/** Which banner survives a hydration. */
function nextBlock(
  state: DebriefState,
  phase: DebriefPhase,
  fullyConfirmed: boolean,
): DebriefBlock {
  if (!fullyConfirmed) {
    // An auth failure is more actionable than "couldn't confirm", so it wins.
    if (state.block.kind === 'auth') return state.block;
    return {
      kind: 'error',
      message: 'Could not confirm server state — refresh to retry.',
    };
  }
  // A rejection is about text the technician can still fix, so it survives a
  // refetch that confirms the question is still unanswered. Once the server
  // says the debrief got past that point, the hint is stale — drop it.
  return phaseAtLeast(phase, 'answered') ? { kind: 'none' } : state.block;
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
  if (isUnconfirmed(state)) return 'Could not confirm server state';
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
  if (isUnconfirmed(state)) {
    // Name the part that failed, so the reviewer knows what is still safe to
    // do rather than assuming the whole moment is frozen.
    if (state.questionUnconfirmed && state.cardUnconfirmed) {
      return 'Could not confirm server state — refresh to retry. Nothing here can be acted on until this moment is verified.';
    }
    if (state.questionUnconfirmed) {
      return 'Could not confirm this moment’s debrief question — refresh to retry. Your typed answer is saved.';
    }
    return 'Could not confirm whether a card exists for this moment — refresh to retry. Compiling and publishing stay locked.';
  }
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
