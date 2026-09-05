import Link from 'next/link';

import LevelPicker from '@/components/LevelPicker';
import { readDemoOverrides } from '@/lib/levelStore';
import { demoReadiness, liveReadiness, type ReadinessData } from '@/lib/readiness';
import {
  READINESS_LABEL,
  READINESS_LEVELS,
  READINESS_SHORT,
  cellsForTech,
  evidenceSummary,
  hasEvidence,
  reviewQueue,
  type ReadinessCell,
  type ReadinessLevel,
} from '@act/domain';

export const dynamic = 'force-dynamic';

interface SearchParamsShape {
  demo?: string;
  tech?: string;
}

export default async function ReadinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const demo = sp.demo === '1';

  let data: ReadinessData | null = null;
  let error: string | null = null;
  try {
    data = demo ? demoReadiness(new Date(), await readDemoOverrides()) : await liveReadiness();
  } catch (e) {
    error = e instanceof Error ? e.message : 'readiness read failed';
  }

  const base = demo ? '/readiness?demo=1' : '/readiness';
  const techHref = (techId: string) => `${base}${demo ? '&' : '?'}tech=${encodeURIComponent(techId)}`;

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div className="col gap-8">
            <h1 className="h1">Readiness</h1>
            <div className="muted">
              Which job types each technician can handle, and under what supervision. Evidence is
              counted. The level is a manager&apos;s call.
            </div>
          </div>
          <div className="row gap-8 wrap">
            {demo ? (
              <span className="pill warn">demo · {data?.shopName}</span>
            ) : (
              <span className="pill">live · act-api</span>
            )}
          </div>
        </div>
        {demo ? (
          <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
            Fictional shop and fictional technicians. Nothing here is customer usage.{' '}
            <Link href="/readiness">Leave demo</Link> · <Link href="/learn?demo=1">Practice view</Link>
          </div>
        ) : null}
        {error ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            Couldn&apos;t build the matrix: {error}
          </div>
        ) : null}
        {data?.warnings.map((warning) => (
          <div key={warning} className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            Unconfirmed: {warning}
          </div>
        ))}
        {data?.source === 'live' && data.levelsSource === 'none' ? (
          <div className="notice">
            Levels are not stored yet. act-api needs <code>/readiness/levels</code> (spec in
            docs/act-api-handoff.md); this app already calls it. The evidence columns are live.
          </div>
        ) : null}
        {data?.source === 'live' && data.levelsSource === 'unconfirmed' ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            The level read failed. Cells show without levels because the read failed, not because
            none are set.
          </div>
        ) : null}
        {data?.source === 'demo' ? (
          <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
            Demo: levels you set here are kept in this browser only. Nothing is written to act-api.
          </div>
        ) : null}
      </header>

      {data ? <Matrix data={data} techHref={techHref} demo={demo} /> : null}

      {data && sp.tech ? <TechDetail data={data} techId={sp.tech} demo={demo} /> : null}

      {data ? <ReviewList data={data} techHref={techHref} /> : null}

      <section className="col gap-8">
        <div className="h3">Levels</div>
        <div className="row gap-8 wrap">
          {READINESS_LEVELS.map((level) => (
            <span key={level} className="pill">
              {READINESS_SHORT[level]} — {READINESS_LABEL[level]}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Matrix({
  data,
  techHref,
  demo,
}: {
  data: ReadinessData;
  techHref: (techId: string) => string;
  demo: boolean;
}) {
  const { matrix } = data;
  if (matrix.techs.length === 0 || matrix.activities.length === 0) {
    return (
      <div className="empty">
        No technicians with practice or field evidence yet.
        {!demo ? (
          <>
            {' '}
            Log a job or complete a case, or open the <Link href="/readiness?demo=1">demo shop</Link>.
          </>
        ) : null}
      </div>
    );
  }
  return (
    <section className="col gap-8">
      <div className="row between wrap">
        <div className="h2">Technician × work activity</div>
        <div className="muted" style={{ fontSize: 13 }}>
          Orange edge: evidence moved since the manager last set a level.
        </div>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th>Technician</th>
              {matrix.activities.map((activity) => (
                <th key={activity.id}>{activity.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.techs.map((tech) => {
              const unconfirmed = data.unconfirmedTechs.includes(tech.id);
              return (
                <tr key={tech.id}>
                  <th scope="row">
                    <Link href={techHref(tech.id)} className="col" style={{ gap: 2, textDecoration: 'none' }}>
                      <span>{tech.name}</span>
                      {tech.role ? <span className="evidence-key">{tech.role.replace(/_/g, ' ')}</span> : null}
                    </Link>
                  </th>
                  {matrix.activities.map((activity) => {
                    const cell = cellsForTech(matrix, tech.id).find((c) => c.activityId === activity.id);
                    return (
                      <td key={activity.id} className={cell?.reviewSuggested ? 'review' : ''}>
                        {unconfirmed ? <span className="muted">unconfirmed</span> : <CellBody cell={cell} />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CellBody({ cell }: { cell: ReadinessCell | undefined }) {
  if (!cell) return null;
  const summary = evidenceSummary(cell.evidence);
  const level = cell.level?.level ?? null;
  if (!level && !summary) return <span className="muted">—</span>;
  return (
    <div className="col" style={{ gap: 4 }}>
      {level ? <LevelPill level={level} /> : <span className="evidence-key">not set</span>}
      {summary ? <span className="muted" style={{ fontSize: 12 }}>{summary}</span> : null}
    </div>
  );
}

function LevelPill({ level }: { level: ReadinessLevel }) {
  const tone =
    level === 'independent' || level === 'mentor' ? 'success' : level === 'observe' ? '' : 'warn';
  return <span className={`pill ${tone}`}>{READINESS_SHORT[level]}</span>;
}

function TechDetail({ data, techId, demo }: { data: ReadinessData; techId: string; demo: boolean }) {
  const tech = data.matrix.techs.find((t) => t.id === techId);
  if (!tech) return null;
  const cells = cellsForTech(data.matrix, tech.id).filter((cell) => cell.level || hasEvidence(cell.evidence));
  const activityLabel = (id: string) => data.matrix.activities.find((a) => a.id === id)?.label ?? id;
  return (
    <section className="card col gap-16" style={{ borderLeft: '4px solid var(--primary)' }}>
      <div className="col gap-8">
        <div className="h2">{tech.name}</div>
        {tech.role ? <div className="evidence-key">{tech.role.replace(/_/g, ' ')}</div> : null}
      </div>
      {cells.length === 0 ? <div className="muted">No evidence and no level yet.</div> : null}
      {cells.map((cell) => (
        <div key={cell.activityId} className="col gap-8" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="row between wrap gap-8">
            <div className="h2" style={{ fontSize: 15 }}>{activityLabel(cell.activityId)}</div>
            {cell.reviewSuggested ? <span className="pill warn">review suggested</span> : null}
          </div>
          <EvidenceGrid cell={cell} />
          {cell.level ? (
            <div className="notice col" style={{ gap: 4 }}>
              <div className="row gap-8 wrap">
                <LevelPill level={cell.level.level} />
                <span className="muted" style={{ fontSize: 12 }}>
                  set {shortDate(cell.level.setAt)} by {cell.level.setBy.replace(/^demo-tech-/, '')}
                </span>
              </div>
              {cell.level.note ? <div>{cell.level.note}</div> : null}
            </div>
          ) : null}
          <LevelPicker
            techId={tech.id}
            activityId={cell.activityId}
            current={cell.level?.level ?? null}
            techName={tech.name}
            activityLabel={activityLabel(cell.activityId)}
            mode={demo ? 'demo' : 'live'}
          />
        </div>
      ))}
    </section>
  );
}

function EvidenceGrid({ cell }: { cell: ReadinessCell }) {
  const e = cell.evidence;
  const items: Array<[string, number | string]> = [];
  if (e.practiceCompletions) items.push(['Cases practiced', e.practiceCompletions]);
  if (e.practiceCommits) items.push(['Commits', e.practiceCommits]);
  if (e.distinctCases) items.push(['Distinct cases', e.distinctCases]);
  if (e.variantsCompleted) items.push(['Delayed variants', e.variantsCompleted]);
  if (e.fieldJobs) items.push(['Field jobs', e.fieldJobs]);
  if (e.jobsWithOutcome) items.push(['With outcome', e.jobsWithOutcome]);
  if (e.callbacks) items.push(['Callbacks', e.callbacks]);
  if (e.lastActivityAt) items.push(['Last activity', shortDate(e.lastActivityAt)]);
  if (items.length === 0) return <div className="muted" style={{ fontSize: 13 }}>No evidence in this activity.</div>;
  return (
    <div className="row gap-16 wrap">
      {items.map(([label, value]) => (
        <div key={label} className="col" style={{ gap: 2 }}>
          <span className="evidence-key">{label}</span>
          <span className="mono">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewList({ data, techHref }: { data: ReadinessData; techHref: (techId: string) => string }) {
  const queue = reviewQueue(data.matrix);
  if (queue.length === 0) return null;
  const techName = (id: string) => data.matrix.techs.find((t) => t.id === id)?.name ?? id;
  const activityLabel = (id: string) => data.matrix.activities.find((a) => a.id === id)?.label ?? id;
  return (
    <section className="col gap-8">
      <div className="row between wrap">
        <div className="h2">Review suggested</div>
        <div className="muted">{queue.length} cells</div>
      </div>
      <div className="col gap-8">
        {queue.map((cell) => (
          <Link
            key={`${cell.techId}:${cell.activityId}`}
            href={techHref(cell.techId)}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card row gap-16" style={{ borderLeft: '3px solid var(--primary)' }}>
              <div className="col grow" style={{ gap: 4 }}>
                <div className="row gap-8 wrap">
                  <strong>{techName(cell.techId)}</strong>
                  <span className="muted">{activityLabel(cell.activityId)}</span>
                  {cell.level ? <LevelPill level={cell.level.level} /> : <span className="pill">not set</span>}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{evidenceSummary(cell.evidence)}</div>
              </div>
              <div className="muted" style={{ fontSize: 18 }}>›</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
