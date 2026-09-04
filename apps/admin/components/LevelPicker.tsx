'use client';

import { useState } from 'react';

import { READINESS_LABEL, READINESS_LEVELS, type ReadinessLevel } from '@act/domain';

interface Props {
  current: ReadinessLevel | null;
  techName: string;
  activityLabel: string;
  /** Demo: the change is local to this page. Live: no endpoint exists yet. */
  mode: 'demo' | 'live';
}

/**
 * The manager's control. It is deliberately the only place a level can
 * change, and it does not look at the evidence to pick one.
 *
 * Nothing is persisted yet: act-api has no readiness endpoint. The demo lets
 * the manager change the level on screen and says the change is not saved.
 */
export default function LevelPicker({ current, techName, activityLabel, mode }: Props) {
  const [level, setLevel] = useState<ReadinessLevel | ''>(current ?? '');
  const [note, setNote] = useState('');
  const changed = level !== (current ?? '');

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
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What you saw. What has to be true before the next level."
        />
      </label>
      {changed ? (
        <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
          {mode === 'demo'
            ? 'Demo: changed on screen only. In production this writes a manager-signed level record; the evidence counts stay as they are.'
            : 'Not saved. Saving a level needs the act-api readiness endpoint (see docs/diagnostic-case.md).'}
        </div>
      ) : null}
    </div>
  );
}
