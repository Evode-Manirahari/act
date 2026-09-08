'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readPilot0Ledger, writePilot0Ledger } from '@/lib/pilotLedger';
import {
  PILOT0_ACTIVITIES,
  PILOT0_CALENDAR,
  PILOT0_DURATION_DAYS,
  PILOT0_HYPOTHESES,
  PILOT0_SLOT_SPECS,
  emptyLedger,
  medianDebriefMinutes,
  mixReady,
  scoreHypothesis,
  type Pilot0Ledger,
  type Pilot0Slot,
  type Pilot0SlotId,
} from '@act/domain';

const TRI: Array<{ label: string; value: boolean | null }> = [
  { label: 'unconfirmed', value: null },
  { label: 'yes', value: true },
  { label: 'no', value: false },
];

function verdictStyle(verdict: string): { background: string; borderColor: string } | undefined {
  if (verdict === 'pass') return { background: 'var(--success-tint)', borderColor: 'var(--success)' };
  if (verdict === 'fail') return { background: 'var(--error-tint)', borderColor: 'var(--error)' };
  return undefined;
}

export default function Pilot0Board() {
  const [ledger, setLedger] = useState<Pilot0Ledger>(() => emptyLedger());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLedger(readPilot0Ledger());
    setReady(true);
  }, []);

  function save(next: Pilot0Ledger) {
    setLedger(next);
    writePilot0Ledger(next);
  }

  function patchSlot(id: Pilot0SlotId, patch: Partial<Pilot0Slot>) {
    save({
      ...ledger,
      slots: { ...ledger.slots, [id]: { ...ledger.slots[id], ...patch } },
    });
  }

  const median = medianDebriefMinutes(ledger);

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div className="col gap-8">
            <h1 className="h1">Pilot 0 · {PILOT0_DURATION_DAYS} days</h1>
            <div className="muted">
              Five real cases. Thresholds were written before any result. This page is a notebook on
              this browser — not a dashboard, not traction.
            </div>
          </div>
          <span className="pill warn">founder notebook · not usage</span>
        </div>
        <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
          Empty slots stay empty. Do not paste demo-shop ids. Do not count recordings, AI cards, or
          this page&apos;s visits as a pass.{' '}
          <Link href="/">Review queue</Link> · <Link href="/learn">Practice</Link> ·{' '}
          <Link href="/demo">Demo (fictional)</Link>
        </div>
      </header>

      {!ready ? (
        <div className="muted">Loading notebook…</div>
      ) : (
        <>
          <section className="card col gap-16">
            <div className="h2">Shop</div>
            <label className="col gap-8">
              <span className="evidence-key">Operator</span>
              <input
                value={ledger.operator}
                onChange={(e) => save({ ...ledger, operator: e.target.value })}
                placeholder="Shop name — not a demo prefix"
              />
            </label>
            <label className="col gap-8">
              <span className="evidence-key">Day 1 date</span>
              <input
                type="date"
                value={ledger.startedOn}
                onChange={(e) => save({ ...ledger, startedOn: e.target.value })}
              />
            </label>
            <div className="muted">
              Activities in scope: {PILOT0_ACTIVITIES.join(', ')}. Mix ready:{' '}
              {mixReady(ledger) ? 'yes' : 'no'}
              {median != null ? ` · median debrief ${median} min` : ''}
            </div>
          </section>

          <section className="col gap-16">
            <div className="h2">Fifteen days</div>
            {PILOT0_CALENDAR.map((row) => (
              <div key={row.days} className="card col gap-8">
                <div className="evidence-key">Days {row.days}</div>
                <div className="h3">{row.title}</div>
                <div>{row.work}</div>
              </div>
            ))}
          </section>

          <section className="col gap-16">
            <div className="h2">Five cases</div>
            {PILOT0_SLOT_SPECS.map((spec) => {
              const slot = ledger.slots[spec.id];
              return (
                <div key={spec.id} className="card col gap-16">
                  <div className="row between wrap">
                    <div className="h3">{spec.label}</div>
                    <span className="pill">{spec.episodeType.replace('_', ' ')}</span>
                  </div>
                  <div className="row wrap gap-16">
                    <label className="col gap-8 grow">
                      <span className="evidence-key">Moment id</span>
                      <input
                        value={slot.momentId}
                        onChange={(e) => patchSlot(spec.id, { momentId: e.target.value })}
                        placeholder="from review queue"
                      />
                    </label>
                    <label className="col gap-8 grow">
                      <span className="evidence-key">Card id</span>
                      <input
                        value={slot.cardId}
                        onChange={(e) => patchSlot(spec.id, { cardId: e.target.value })}
                        placeholder="after compile"
                      />
                    </label>
                    <label className="col gap-8">
                      <span className="evidence-key">Debrief minutes</span>
                      <input
                        type="number"
                        min={0}
                        value={slot.debriefMinutes ?? ''}
                        onChange={(e) =>
                          patchSlot(spec.id, {
                            debriefMinutes: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="row wrap gap-16">
                    <label className="col gap-8">
                      <span className="evidence-key">Expert edits after compile</span>
                      <input
                        type="number"
                        min={0}
                        value={slot.expertEdits ?? ''}
                        onChange={(e) =>
                          patchSlot(spec.id, {
                            expertEdits: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="col gap-8">
                      <span className="evidence-key">Unsupported claims refused</span>
                      <input
                        type="number"
                        min={0}
                        value={slot.unsupportedClaims ?? ''}
                        onChange={(e) =>
                          patchSlot(spec.id, {
                            unsupportedClaims: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="col gap-8">
                    <span className="evidence-key">Friction</span>
                    <textarea
                      rows={2}
                      value={slot.friction}
                      onChange={(e) => patchSlot(spec.id, { friction: e.target.value })}
                      placeholder="What slowed capture, debrief, or review"
                    />
                  </label>
                  <div className="row wrap gap-16">
                    <Tri
                      label="Hidden judgment vs work order"
                      value={slot.hiddenJudgment}
                      onChange={(hiddenJudgment) => patchSlot(spec.id, { hiddenJudgment })}
                    />
                    <Tri
                      label="Senior will do another"
                      value={slot.willingToRepeat}
                      onChange={(willingToRepeat) => patchSlot(spec.id, { willingToRepeat })}
                    />
                    <label className="row gap-8">
                      <input
                        type="checkbox"
                        checked={slot.learnerCommitted}
                        onChange={(e) => patchSlot(spec.id, { learnerCommitted: e.target.checked })}
                      />
                      Learner committed
                    </label>
                    <label className="row gap-8">
                      <input
                        type="checkbox"
                        checked={slot.variantScheduled}
                        onChange={(e) => patchSlot(spec.id, { variantScheduled: e.target.checked })}
                      />
                      Variant scheduled 7–14d
                    </label>
                  </div>
                  {slot.momentId.trim() ? (
                    <Link href={`/moments/${slot.momentId.trim()}`}>Open moment</Link>
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className="col gap-16">
            <div className="h2">Day 13–15 calls</div>
            <label className="col gap-8">
              <span className="evidence-key">Manager action (or “no change”)</span>
              <textarea
                rows={3}
                value={ledger.managerAction}
                onChange={(e) => save({ ...ledger, managerAction: e.target.value })}
                placeholder="What coaching, supervision, or dispatch decision changed?"
              />
            </label>
            <Tri
              label="Juniors call the cases credible"
              value={ledger.juniorsSayCredible}
              onChange={(juniorsSayCredible) => save({ ...ledger, juniorsSayCredible })}
            />
            <Tri
              label="Commits distinguish reasoning, not recall"
              value={ledger.commitsDistinguish}
              onChange={(commitsDistinguish) => save({ ...ledger, commitsDistinguish })}
            />
            <Tri
              label="Operator wants paid follow-on"
              value={ledger.wantsFollowOn}
              onChange={(wantsFollowOn) => save({ ...ledger, wantsFollowOn })}
            />
          </section>

          <section className="col gap-16">
            <div className="h2">Hypotheses — scored against the pre-committed line</div>
            {PILOT0_HYPOTHESES.map((h) => {
              const verdict = scoreHypothesis(ledger, h.id);
              return (
                <div key={h.id} className="card col gap-8" style={verdictStyle(verdict)}>
                  <div className="row between wrap">
                    <div className="h3">{h.claim}</div>
                    <span className="pill">{verdict}</span>
                  </div>
                  <div className="muted">{h.measure}</div>
                  <div>Pass: {h.passSignal}</div>
                  <div>If it fails: {h.ifFails}</div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function Tri({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <label className="col gap-8">
      <span className="evidence-key">{label}</span>
      <select
        value={value === null ? 'unconfirmed' : value ? 'yes' : 'no'}
        onChange={(e) => {
          const picked = TRI.find((item) => item.label === e.target.value);
          onChange(picked ? picked.value : null);
        }}
      >
        {TRI.map((item) => (
          <option key={item.label} value={item.label}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
