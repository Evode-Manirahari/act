'use client';

import { useMemo, useReducer, useState } from 'react';

import type { KnowledgeObjectOut } from '@/lib/api';
import {
  CHALLENGE_PROMPT,
  COMPARISON_LABEL,
  EPISODE_LABEL,
  canPractice,
  commitReady,
  compareCommitToExpert,
  diagnosticCaseFromKnowledgeObject,
  expertHidden,
  filled,
  initialPlayerState,
  reducePlayer,
  type LearnerCommit,
  type PlayerEvent,
  type PlayerState,
} from '@act/domain';

export default function CasePractice({ card }: { card: KnowledgeObjectOut }) {
  const diag = useMemo(() => diagnosticCaseFromKnowledgeObject(card), [card]);
  const [state, dispatch] = useReducer(
    reducePlayer,
    { hasSafety: Boolean(diag.safetyBoundary?.trim()) },
    initialPlayerState,
  );
  const hideExpert = expertHidden(state.stage);
  const comparisons = compareCommitToExpert(diag, state.commit);

  if (!canPractice(diag)) {
    return (
      <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
        Not enough case to practice. Situation plus a cue or decision is required.
      </div>
    );
  }

  return (
    <article className="card col gap-16">
      <div className="col gap-8">
        <div className="evidence-key">{EPISODE_LABEL[diag.episodeType]} · commit first</div>
        <div className="h2">{diag.title}</div>
        <div className="muted">
          State your diagnosis before the expert view. This is practice, not a score.
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
            disabled={!commitReady(state.commit)}
            onClick={() => dispatch({ type: 'submit_commit' })}
          >
            Commit decision
          </button>
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
            disabled={!filled(state.reflection)}
            onClick={() => dispatch({ type: 'submit_reflect' })}
          >
            Finish practice
          </button>
        </div>
      ) : null}

      {state.stage === 'complete' ? (
        <div className="notice" style={{ background: 'var(--success-tint)', borderColor: 'var(--success)' }}>
          Practice complete. This browser session does not grade you and does not change readiness.
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
