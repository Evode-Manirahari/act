import Link from 'next/link';

import { api } from '@/lib/api';
import { ACT_API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';


export const dynamic = 'force-dynamic';


function formatSeconds(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}


export default async function ReviewQueuePage() {
  let queue: Awaited<ReturnType<typeof api.reviewQueue>> = [];
  let summary: Awaited<ReturnType<typeof api.dashboardSummary>> | null = null;
  let error: string | null = null;
  try {
    [queue, summary] = await Promise.all([
      api.reviewQueue('proposed', 50),
      api.dashboardSummary(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error';
  }

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <h1 className="h1">Review queue</h1>
          <div className="muted mono" style={{ fontSize: 12 }}>{ACT_API_BASE}</div>
        </div>
        {error && (
          <div className="notice" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
            Couldn&apos;t reach the API: {error}
          </div>
        )}
      </header>

      {summary && (
        <section className="col gap-8">
          <div className="h3">Pilot health</div>
          <div className="row wrap gap-16">
            <Stat label="Recordings ready" value={summary.recordings_ready} sub={`of ${summary.recordings_total}`} />
            <Stat label="Moments proposed" value={summary.moments_proposed} />
            <Stat label="Moments approved" value={summary.moments_approved} />
            <Stat label="Cards published" value={summary.knowledge_objects_published} />
            <Stat
              label="Training events 7d"
              value={summary.training_events_last_7_days}
              sub={`${summary.quiz_correct}/${summary.quiz_attempts} quiz correct`}
            />
            <Stat label="Callbacks" value={summary.callbacks} sub={`of ${summary.jobs_with_outcomes} outcomes`} />
          </div>
        </section>
      )}

      <section className="col gap-8">
        <div className="row between">
          <div className="h2">Proposed teachable moments</div>
          <div className="muted">{queue.length} pending</div>
        </div>

        {queue.length === 0 ? (
          <div className="empty">
            No proposed moments yet. Capture a job from mobile, run the pipeline,
            and they&apos;ll land here, highest-scoring first.
          </div>
        ) : (
          <div className="col gap-8">
            {queue.map((m) => (
              <Link key={m.id} href={`/moments/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card row gap-16">
                  <div className="score">{m.score.toFixed(1)}</div>
                  <div className="col grow gap-8" style={{ gap: 4 }}>
                    <div className="row gap-8 wrap">
                      <strong>{prettyType(m.moment_type)}</strong>
                      <StatusBadge value={m.status} />
                      {m.do_not_interrupt && <span className="pill warn">do not interrupt</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {m.why_it_matters || <em>no rationale</em>}
                    </div>
                    <div className="mono muted" style={{ fontSize: 12 }}>
                      window {formatSeconds(m.start_s)} – {formatSeconds(m.end_s)}
                      &nbsp;·&nbsp; recording {m.recording_id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 18 }}>›</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


function prettyType(type: string): string {
  switch (type) {
    case 'safety_boundary': return 'Safety boundary';
    case 'measurement_threshold': return 'Measurement → decision';
    case 'sensory_cue': return 'Sensory cue';
    case 'counterfactual': return 'Counterfactual';
    case 'verification': return 'Verification';
    case 'diagnostic_shortcut': return 'Diagnostic shortcut';
    default: return type;
  }
}


function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card col" style={{ gap: 4, minWidth: 160 }}>
      <div className="h3" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }} className="mono">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}
