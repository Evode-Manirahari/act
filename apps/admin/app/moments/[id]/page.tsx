import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api } from '@/lib/api';
import MomentActions from '@/components/MomentActions';
import QuestionPanel from '@/components/QuestionPanel';
import StatusBadge from '@/components/StatusBadge';


export const dynamic = 'force-dynamic';


function formatSeconds(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}


export default async function MomentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No direct GET /moments/{id} endpoint yet — find this moment in the
  // cross-recording queue. Falls back to scanning approved/rejected so a
  // reviewer can still see the detail page after acting on it.
  const statuses = ['proposed', 'approved', 'rejected', 'needs_more_info'];
  let moment: Awaited<ReturnType<typeof api.reviewQueue>>[number] | undefined;
  for (const status of statuses) {
    const batch = await api.reviewQueue(status, 200).catch(() => []);
    moment = batch.find((m) => m.id === id);
    if (moment) break;
  }
  if (!moment) {
    notFound();
  }

  const [segments, questions] = await Promise.all([
    api.segments(moment.recording_id).catch(() => []),
    api.questions(moment.id).catch(() => []),
  ]);

  // Filter the transcript to segments inside the moment's padded window
  // so the reviewer sees context without scrolling the whole job.
  const PAD = 4;
  const windowSegments = segments.filter(
    (s) => s.end_s >= moment.start_s - PAD && s.start_s <= moment.end_s + PAD,
  );

  const evidence =
    typeof moment.evidence_json === 'string'
      ? safeJSON(moment.evidence_json)
      : moment.evidence_json;

  return (
    <div className="col gap-24">
      <div className="row gap-8">
        <Link href="/" className="muted">‹ Back to queue</Link>
      </div>

      <header className="col gap-8">
        <div className="row between wrap">
          <h1 className="h1">{prettyType(moment.moment_type)}</h1>
          <div className="row gap-8 wrap">
            <span className="score">{moment.score.toFixed(1)}</span>
            <StatusBadge value={moment.status} />
            {moment.do_not_interrupt && <span className="pill warn">do not interrupt</span>}
          </div>
        </div>
        <div className="muted mono" style={{ fontSize: 13 }}>
          window {formatSeconds(moment.start_s)} – {formatSeconds(moment.end_s)}
          &nbsp;·&nbsp; recording {moment.recording_id}
        </div>
        {moment.why_it_matters && (
          <div className="notice">{moment.why_it_matters}</div>
        )}
      </header>

      <section className="col gap-16">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
          gap: 24,
        }}>
          <div className="col gap-16">
            <div className="card col gap-8">
              <div className="h2">Transcript window</div>
              {windowSegments.length === 0 ? (
                <div className="muted">No transcript segments inside this window.</div>
              ) : (
                <div className="col gap-8">
                  {windowSegments.map((s) => (
                    <div key={s.id} className="row gap-16">
                      <span className="mono muted" style={{ fontSize: 12, minWidth: 64 }}>
                        {formatSeconds(s.start_s)}
                      </span>
                      <span style={{ fontSize: 14 }}>
                        {s.speaker_label && (
                          <span className="muted" style={{ marginRight: 6 }}>
                            {s.speaker_label}:
                          </span>
                        )}
                        {s.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card col gap-8">
              <div className="h2">Evidence</div>
              {evidence && Object.keys(evidence).length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(evidence).map(([key, value]) => (
                      <tr key={key} style={{ borderTop: '1px solid var(--border)' }}>
                        <td
                          className="evidence-key"
                          style={{ verticalAlign: 'top', padding: '8px 12px 8px 0', minWidth: 140 }}
                        >
                          {key.replace(/_/g, ' ')}
                        </td>
                        <td className="evidence-value" style={{ padding: '8px 0' }}>
                          {renderEvidenceValue(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted">No evidence captured.</div>
              )}
            </div>
          </div>

          <div className="col gap-16">
            <div className="card col gap-8">
              <div className="h2">Reviewer actions</div>
              <MomentActions momentId={moment.id} initialStatus={moment.status} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <QuestionPanel
          momentId={moment.id}
          initialQuestions={questions}
          momentApproved={moment.status === 'approved'}
        />
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


function safeJSON(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}


function renderEvidenceValue(value: unknown): string {
  if (value === null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
}
