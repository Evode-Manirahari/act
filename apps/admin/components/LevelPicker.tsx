'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { READINESS_LABEL, READINESS_LEVELS, type ReadinessLevel } from '@act/domain';

interface Props {
  techId: string;
  activityId: string;
  current: ReadinessLevel | null;
  techName: string;
  activityLabel: string;
  /** Demo: saved to this browser. Live: forwarded to act-api, which may not have the endpoint yet. */
  mode: 'demo' | 'live';
}

/**
 * The manager's control. It is deliberately the only place a level can
 * change, and it does not look at the evidence to pick one. The browser sends
 * tech, activity, level, and note; who set it is derived on the server.
 */
export default function LevelPicker({ techId, activityId, current, techName, activityLabel, mode }: Props) {
  const [level, setLevel] = useState<ReadinessLevel | ''>(current ?? '');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const changed = level !== (current ?? '') || note.trim().length > 0;

  function save() {
    setResult(null);
    startTransition(async () => {
      const response = await fetch('/api/readiness/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech_user_id: techId,
          activity_id: activityId,
          level: level || null,
          note: note.trim() || null,
        }),
      });
      if (!response.ok) {
        setResult({ ok: false, message: (await response.text()) || `save failed (${response.status})` });
        return;
      }
      const saved = (await response.json()) as { stored: 'browser' | 'act-api' };
      setResult({
        ok: true,
        message:
          saved.stored === 'browser'
            ? 'Saved in this browser (demo). In production this is a manager-signed record in act-api. The evidence counts did not change.'
            : 'Saved to act-api.',
      });
      setNote('');
      router.refresh();
    });
  }

  return (
    <div className="col gap-8">
      <label className="col gap-8">
        <span className="evidence-key">
          Set level — {techName} · {activityLabel}
        </span>
        <select value={level} onChange={(e) => setLevel(e.target.value as ReadinessLevel | '')}>
          <option value="">Not set</option>
          {READINESS_LEVELS.map((option) => (
            <option key={option} value={option}>
              {READINESS_LABEL[option]}
            </option>
          ))}
        </select>
      </label>
      <label className="col gap-8">
        <span className="evidence-key">Why (one line the tech will read)</span>
        <textarea
          rows={2}
          style={{ minHeight: 64 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What you saw. What has to be true before the next level."
        />
      </label>
      <div className="row gap-8 wrap" style={{ alignItems: 'center' }}>
        <button className="primary" onClick={save} disabled={!changed || isPending}>
          {isPending ? 'Saving' : 'Save level'}
        </button>
        {mode === 'live' ? (
          <span className="muted" style={{ fontSize: 12 }}>
            Forwards to act-api /readiness/levels.
          </span>
        ) : null}
      </div>
      {result ? (
        <div
          className="notice"
          style={
            result.ok
              ? { background: 'var(--success-tint)', borderColor: 'var(--success)' }
              : { color: 'var(--error)', borderColor: 'var(--error)' }
          }
        >
          {result.message}
        </div>
      ) : null}
    </div>
  );
}
