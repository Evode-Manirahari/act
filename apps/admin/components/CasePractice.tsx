'use client';

import { useMemo, useReducer, useState } from 'react';

import type { KnowledgeObjectOut } from '@/lib/api';
import {
  CHALLENGE_PROMPT,
  COMPARISON_LABEL,
  EPISODE_LABEL,
  VARIANT_PROMPT,
  canPractice,
  commitEventNote,
  commitReady,
  compareCommitToExpert,
  diagnosticCaseFromKnowledgeObject,
  expertHidden,
  filled,
  initialPlayerState,
  learnerPrompt,
  reducePlayer,
  variantEventNote,
  type LearnerCommit,
  type PlayerEvent,
  type PlayerState,
} from '@act/domain';

interface Props {
  card: KnowledgeObjectOut;
  /** Delayed variant: the title stays hidden until the reveal; the learner names the principle first. */
  variant?: boolean;
  /** Post practice events to act-api through this server. Off for demo cases. */
  record?: boolean;
}

async function postEvent(body: { knowledge_object_id: string; event_type: string; note: string }) {
  const response = await fetch('/api/training-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error((await response.text().catch(() => '')) || `save failed (${response.status})`);
  }
}

export default function CasePractice({ card, variant = false, record = false }: Props) {
  const diag = useMemo(() => diagnosticCaseFromKnowledgeObject(card), [card]);
  const [state, dispatch] = useReducer(
    reducePlayer,
    { hasSafety: Boolean(diag.safetyBoundary?.trim()) },
    initialPlayerState,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hideExpert = expertHidden(state.stage);
  const comparisons = compareCommitToExpert(diag, state.commit);

  if (!canPractice(diag)) {
    return (
      <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
        Not enough case to practice. Situation plus a cue or decision is required.
      </div>
    );
  }

  const note = () =>
    variant
      ? variantEventNote(state.commit, state.disconfirm, state.reflection)
      : commitEventNote(state.commit, state.disconfirm, state.reflection);

  async function save(eventType: 'quiz_attempted' | 'completed'): Promise<boolean> {
    if (!record) return true;
    setSaving(true);
    setSaveError(null);
    try {
      await postEvent({ knowledge_object_id: card.id, event_type: eventType, note: note() });
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'could not save your decision');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onCommit() {
    if (await save('quiz_attempted')) dispatch({ type: 'submit_commit' });
  }

  async function onFinish() {
    dispatch({ type: 'submit_reflect' });
    await save('completed');
  }

  return (
    <article className="card col gap-16">
      <div className="col gap-8">
        <div className="evidence-key">
          {variant ? 'Delayed variant · ' : ''}
          {EPISODE_LABEL[diag.episodeType]} · commit first
        </div>
        <div className="h2">{variant && hideExpert ? 'Same principle, different call' : diag.title}</div>
        <div className="muted">
          {variant ? VARIANT_PROMPT : learnerPrompt(diag)}
        </div>
      </div>

      {diag.safetyBoundary && (state.stage === 'safety' || !hideExpert) ? (
        <div className="notice" style={{ background: 'var(--error-tint)', borderColor: 'var(--error)' }}>
          <div className="evidence-key">Safety — stop conditions first</div>
          <div>{diag.safetyBoundary}</div>
          {state.stage === 'safety' ? (
            <button className="primary" onClick={() => dispatch({ type: 'acknowledge_safety' })}>
              I understand — continue
            </button>
          ) : null}
        </div>
      ) : null}

      {state.stage !== 'safety' ? (
        <Field label="The call" value={diag.presentingProblem} />
      ) : null}

      {state.stage === 'commit' ? (
        <div className="col gap-16">
          <CommitField
            state={state}
            dispatch={dispatch}
            field="cue"
            label="Most important cue"
          />
          <CommitField
            state={state}
            dispatch={dispatch}
            field="hypothesis"
            label="Working hypothesis"
          />
          <CommitField
            state={state}
            dispatch={dispatch}
            field="nextTest"
            label="Next test"
          />
          <CommitField
            state={state}
            dispatch={dispatch}
            field="rationale"
            label="Why that test"
          />
          <button
            className="primary"
            disabled={!commitReady(state.commit) || saving}
            onClick={onCommit}
          >
            {saving ? 'Saving…' : 'Commit decision'}
          </button>
          {saveError ? (
            <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
              {saveError}
            </div>
          ) : null}
        </div>
      ) : null}

      {state.stage === 'challenge' ? (
        <div className="col gap-8">
          <div className="evidence-key">Challenge</div>
          <div>{CHALLENGE_PROMPT}</div>
          <textarea
            value={state.disconfirm}
            onChange={(e) => dispatch({ type: 'set_disconfirm', value: e.target.value })}
            placeholder="Name a reading, sight, or sound that would kill this hypothesis."
            rows={3}
          />
          <button
            className="primary"
            disabled={!filled(state.disconfirm)}
            onClick={() => dispatch({ type: 'submit_challenge' })}
          >
            Show expert comparison
          </button>
        </div>
      ) : null}

      {(state.stage === 'reveal' || state.stage === 'reflect' || state.stage === 'complete') && (
        <div className="col gap-16">
          <div className="evidence-key">Expert comparison — not a score</div>
          {comparisons.map((line) => (
            <div key={line.dimension} className="col gap-8">
              <div className="evidence-key">{COMPARISON_LABEL[line.dimension]}</div>
              <div>{line.expert}</div>
              {line.learner ? <div className="muted">You said: {line.learner}</div> : null}
            </div>
          ))}
          <Field label="Verification" value={diag.verification} />
          {state.stage === 'reveal' ? (
            <button className="primary" onClick={() => dispatch({ type: 'continue_reveal' })}>
              What transfers?
            </button>
          ) : null}
        </div>
      )}

      {state.stage === 'reflect' ? (
        <div className="col gap-8">
          <div className="evidence-key">What transfers</div>
          <textarea
            value={state.reflection}
            onChange={(e) => dispatch({ type: 'set_reflection', value: e.target.value })}
            placeholder="The principle, not the part number."
            rows={3}
          />
          <button
            className="primary"
            disabled={!filled(state.reflection) || saving}
            onClick={onFinish}
          >
            {variant ? 'Finish variant' : 'Finish practice'}
          </button>
        </div>
      ) : null}

      {state.stage === 'complete' ? (
        <div className="notice" style={{ background: 'var(--success-tint)', borderColor: 'var(--success)' }}>
          {variant ? 'Variant complete.' : 'Practice complete.'}{' '}
          {record
            ? 'Your commit and reflection are recorded as evidence. Nobody is graded here; your manager sets readiness.'
            : 'Demo session — nothing was recorded.'}
          {saveError ? <div style={{ color: 'var(--error)', marginTop: 8 }}>{saveError}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function CommitField({
  state,
  dispatch,
  field,
  label,
}: {
  state: PlayerState;
  dispatch: (event: PlayerEvent) => void;
  field: keyof LearnerCommit;
  label: string;
}) {
  return (
    <label className="col gap-8">
      <span className="evidence-key">{label}</span>
      <textarea
        value={state.commit[field]}
        onChange={(e) => dispatch({ type: 'set_commit', field, value: e.target.value })}
        rows={2}
      />
    </label>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="evidence-key">{label}</div>
      <div className="evidence-value">{value}</div>
    </div>
  );
}
