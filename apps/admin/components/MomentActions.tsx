'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';


interface Props {
  momentId: string;
  initialStatus: string;
}

export default function MomentActions({ momentId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function review(newStatus: 'approved' | 'rejected' | 'needs_more_info') {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/moments/${momentId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, review_note: note || undefined }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const updated = await response.json();
      setStatus(updated.status ?? newStatus);
      router.refresh();
    });
  }

  return (
    <div className="col gap-8">
      <div className="row gap-8">
        <strong>Status:</strong>
        <span className="pill">{status.replace(/_/g, ' ')}</span>
      </div>
      <textarea
        placeholder="Review note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />
      <div className="row gap-8 wrap">
        <button
          className="success"
          disabled={isPending}
          onClick={() => review('approved')}
        >
          Approve
        </button>
        <button
          className="danger"
          disabled={isPending}
          onClick={() => review('rejected')}
        >
          Reject
        </button>
        <button
          className="ghost"
          disabled={isPending}
          onClick={() => review('needs_more_info')}
        >
          Needs more info
        </button>
      </div>
      {error && <div className="notice" style={{ color: 'var(--error)' }}>{error}</div>}
    </div>
  );
}
