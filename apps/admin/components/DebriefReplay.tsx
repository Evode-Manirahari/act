'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  REJECT_LABEL,
  checkCaseGrounding,
  claimsFromDraft,
  contentTokens,
  currentQuestion,
  interviewComplete,
  recordAnswer,
  startInterview,
  type CaseGap,
  type DemoDebrief,
  type InterviewState,
} from '@act/domain';

const GAP_LABEL: Record<CaseGap, string> = {
  cue: 'Cue',
  hypothesis: 'Hypotheses',
  discriminating_test: 'Discriminating test',
  causal_link: 'Why it fit',
  boundary: 'Safety boundary',
  verification: 'Verification',
  novice_trap: 'Novice trap',
};

const CLAIM_LABEL: Record<string, string> = {
  cue: 'Cue',
  hypothesis: 'Hypotheses',
  decision: 'Discriminating test',
  reasoning: 'Why it fit',
  verification: 'Verification',
  trap: 'Novice trap',
  safety: 'Safety boundary',
};

export default function DebriefReplay({ script }: { script: DemoDebrief }) {
  const [state, setState] = useState<InterviewState>(() =>
    startInterview(script.base, script.transcript),
  );
  const [answer, setAnswer] = useState('');
  const [sent, setSent] = useState(false);

  const question = currentQuestion(state, script.episodeType);
  const complete = interviewComplete(state, script.episodeType);
  const report = useMemo(
    () => (complete ? checkCaseGrounding({ claims: claimsFromDraft(state.draft) }, state.sources) : null),
    [complete, state.draft, state.sources],
  );
  // Transcript lines that share three or more content words with a drafted
  // claim. The answer is the source of record; this shows the footage agrees.
  const transcriptHits = useMemo(() => {
    const claimTokens = claimsFromDraft(state.draft).map((c) => new Set(contentTokens(c.text)));
    return new Set(
      script.transcript
        .filter((seg) => {
          const segTokens = Array.from(new Set(contentTokens(seg.text)));
          return claimTokens.some((set) => segTokens.filter((t) => set.has(t)).length >= 3);
        })
        .map((seg) => seg.id),
    );
  }, [script.transcript, state.draft]);
  const lastTurn = state.turns[state.turns.length - 1];
  const firstTurn = state.turns.length === 0;

  function submit(text: string) {
    if (!question || !text.trim()) return;
    setState(recordAnswer(state, question, text, script.momentMeta));
    setAnswer('');
  }

  return (
    <div className="col gap-24">
      <section className="debrief-grid">
        <div className="col gap-16">
          <div className="card col gap-8">
            <div className="evidence-key">What the system knew before asking</div>
            <div className="row gap-8 wrap">
              <span className="pill">{script.moment.label}</span>
              <span className="pill mono">{script.moment.window}</span>
              <span className="pill">{script.moment.markType.replace(/_/g, ' ')}</span>
              <span className="pill mono">score {script.moment.score}</span>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              A mark is a hint, not evidence. None of these words may appear as an answer.
            </div>
          </div>

          <div className="card col gap-8">
            <div className="row between wrap gap-8">
              <div className="evidence-key">Transcript inside the window</div>
              {transcriptHits.size > 0 ? (
                <span className="muted" style={{ fontSize: 11 }}>orange edge: echoed by a drafted claim</span>
              ) : null}
            </div>
            {script.transcript.map((seg) => (
              <div
                key={seg.id}
                className="notice"
                style={
                  transcriptHits.has(seg.id)
                    ? { borderLeftColor: 'var(--primary)', background: 'var(--surface)' }
                    : undefined
                }
              >
                <span className="mono muted" style={{ fontSize: 11, marginRight: 8 }}>
                  {seg.id.replace('demo-seg-', 'seg ')}
                </span>
                {seg.text}
              </div>
            ))}
          </div>
        </div>

        <div className="card col gap-16" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="col gap-8">
            <div className="evidence-key">Case draft · {state.turns.filter((t) => !t.rejected).length} of 7 fields</div>
            <div className="h2">{script.base.title}</div>
            <div className="muted" style={{ fontSize: 13 }}>{script.base.presentingProblem}</div>
          </div>
          <DraftField label="Cue" value={state.draft.cues} />
          <DraftField
            label="Hypotheses"
            value={state.draft.hypotheses?.map((h) => h.label).join(' / ')}
          />
          <DraftField label="Discriminating test" value={state.draft.discriminatingTest} />
          <DraftField label="Why it fit" value={state.draft.expertReasoning} />
          <DraftField label="Safety boundary" value={state.draft.safetyBoundary} />
          <DraftField label="Verification" value={state.draft.verification} />
          <DraftField label="Novice trap" value={state.draft.noviceTrap} />
        </div>
      </section>

      {question ? (
        <section className="card col gap-16">
          <div className="col gap-8">
            <div className="evidence-key">
              Question {state.turns.filter((t) => !t.rejected).length + 1} · asks for: {GAP_LABEL[question.gap]}
            </div>
            <div className="h2" style={{ fontWeight: 600 }}>{question.question}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              One question, for the first missing field. The model phrases it. It does not answer it.
            </div>
          </div>

          {lastTurn?.rejected ? (
            <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
              <div className="evidence-key" style={{ color: 'var(--error)' }}>
                Refused · {lastTurn.rejected}
              </div>
              <div>{REJECT_LABEL[lastTurn.rejected]}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Kept in the record. Not in the case. The question stays open.
              </div>
            </div>
          ) : null}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Ray's answer, spoken after the job."
          />
          <div className="row gap-8 wrap">
            <button className="primary" disabled={!answer.trim()} onClick={() => submit(answer)}>
              Record answer
            </button>
            <button onClick={() => setAnswer(script.answers[question.gap])}>Use Ray&apos;s answer</button>
            {firstTurn ? (
              <button className="ghost" onClick={() => setAnswer(script.badAnswer)}>
                Try the bad answer
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {report ? (
        <section className="card col gap-16" style={{ borderLeft: `4px solid var(${report.publishable ? '--success' : '--error'})` }}>
          <div className="col gap-8">
            <div className="evidence-key">Grounding check · fail-closed</div>
            <div className="h2">
              {report.publishable ? 'Every claim traces to something someone said.' : 'Blocked.'}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              Token overlap between each claim and the transcript or an accepted answer. Not judgment. It
              can refuse; it cannot approve what a lead tech has not read.
            </div>
          </div>
          <div className="col gap-8">
            {report.claims.map((claim) => (
              <div key={claim.claimId} className="row gap-16" style={{ alignItems: 'flex-start' }}>
                <span className={`pill ${claim.grounded ? 'success' : 'error'}`}>
                  {claim.grounded ? 'grounded' : 'ungrounded'}
                </span>
                <div className="col grow" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 13 }}>{CLAIM_LABEL[claim.claimId] ?? claim.claimId}</strong>
                  <span className="muted mono" style={{ fontSize: 11 }}>
                    {Math.round(claim.score * 100)}% · source {claim.sourceId ?? 'none'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {report.reasons.length > 0 ? (
            <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
              {report.reasons.join(', ')}
            </div>
          ) : null}
          {report.publishable ? (
            sent ? (
              <div className="notice" style={{ background: 'var(--success-tint)', borderColor: 'var(--success)' }}>
                Demo: nothing was written. In production this lands in the lead tech&apos;s review queue; the
                lead approves, edits, or rejects before anyone can practice it.{' '}
                <Link href="/learn?demo=1&q=airflow">See the published case</Link>
              </div>
            ) : (
              <button className="primary" onClick={() => setSent(true)}>
                Send to lead review
              </button>
            )
          ) : null}
        </section>
      ) : null}

      {state.turns.length > 0 ? (
        <section className="col gap-8">
          <div className="h3">Record</div>
          {state.turns.map((turn, index) => (
            <div key={index} className="notice col" style={{ gap: 4 }}>
              <div className="row gap-8 wrap">
                <span className="evidence-key">{GAP_LABEL[turn.gap]}</span>
                {turn.rejected ? <span className="pill error">refused · {turn.rejected}</span> : <span className="pill success">{turn.sourceId}</span>}
              </div>
              <div style={{ fontSize: 13 }}>{turn.answer}</div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function DraftField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="evidence-key">{label}</div>
      {value ? (
        <div className="evidence-value">{value}</div>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>not yet asked</div>
      )}
    </div>
  );
}
