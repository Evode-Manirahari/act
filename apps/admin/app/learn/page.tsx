import Link from 'next/link';

import { api, type KnowledgeObjectOut, type LibraryAskResponse } from '@/lib/api';
import { isActAuthConfigured } from '@/lib/actAuth';
import { demoCardsAsKnowledgeObjects } from '@/lib/readiness';
import CasePractice from '@/components/CasePractice';
import {
  DEMO_SHOP_NAME,
  EPISODE_LABEL,
  VARIANT_STATUS_LABEL,
  demoShop,
  diagnosticCaseFromKnowledgeObject,
  practiceEventFromTrainingEvent,
  variantSchedule,
  type PracticeEvent,
  type VariantSchedule,
} from '@act/domain';

export const dynamic = 'force-dynamic';

interface SearchParamsShape {
  q?: string;
  ask?: string;
  demo?: string;
}

interface LearnerContext {
  learnerId: string | null;
  learnerLabel: string | null;
  events: PracticeEvent[];
  /** The event read failed; variant state is unknown, not "not started". */
  eventsUnconfirmed: boolean;
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const ask = sp.ask?.trim() ?? '';
  const demo = sp.demo === '1';
  const now = new Date();

  let cards: KnowledgeObjectOut[] = [];
  let answer: LibraryAskResponse | null = null;
  let error: string | null = null;
  let askError: string | null = null;
  let learner: LearnerContext = {
    learnerId: null,
    learnerLabel: null,
    events: [],
    eventsUnconfirmed: false,
  };

  if (demo) {
    const shop = demoShop(now);
    cards = demoCardsAsKnowledgeObjects(now).filter((card) => matches(card, q));
    const learnerTech = shop.techs.find((tech) => tech.id === shop.learnerId);
    learner = {
      learnerId: shop.learnerId,
      learnerLabel: learnerTech ? `${learnerTech.name} · ${learnerTech.role}` : shop.learnerId,
      events: shop.events,
      eventsUnconfirmed: false,
    };
  } else {
    try {
      cards = await api.library(q, 'hvac');
    } catch (e) {
      error = e instanceof Error ? e.message : 'library failed';
    }
    if (isActAuthConfigured) {
      try {
        const me = await api.me();
        const rows = await api.apprenticeEvents(me.user_id);
        learner = {
          learnerId: me.user_id,
          learnerLabel: me.email,
          events: rows.map(practiceEventFromTrainingEvent),
          eventsUnconfirmed: false,
        };
      } catch {
        learner = { ...learner, eventsUnconfirmed: true };
      }
    }
  }

  if (ask && !demo) {
    try {
      answer = await api.askLibrary({ query: ask, trade: 'hvac', limit: 3 });
    } catch (e) {
      askError = e instanceof Error ? e.message : 'Ask ACT failed';
    }
  }

  const schedules = new Map<string, VariantSchedule>();
  if (learner.learnerId && !learner.eventsUnconfirmed) {
    for (const card of cards) {
      schedules.set(card.id, variantSchedule(learner.events, card.id, learner.learnerId, now));
    }
  }
  const ordered = [...cards].sort((a, b) => rank(schedules.get(a.id)) - rank(schedules.get(b.id)));
  const dueCount = ordered.filter((card) => isDue(schedules.get(card.id))).length;

  const base = demo ? '/learn?demo=1' : '/learn';

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div className="col gap-8">
            <h1 className="h1">Diagnostic cases</h1>
            <div className="muted">
              Practice the decision before you see what the senior did. Published cases only.
            </div>
            {learner.learnerLabel ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Practicing as <span className="mono">{learner.learnerLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="row gap-8 wrap">
            {demo ? (
              <span className="pill warn">demo · {DEMO_SHOP_NAME}</span>
            ) : (
              <span className="pill success">company-approved library</span>
            )}
            {dueCount > 0 ? <span className="pill warn">{dueCount} variant{dueCount === 1 ? '' : 's'} due</span> : null}
          </div>
        </div>
        {demo ? (
          <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
            Fictional shop. These cases were written for the demo, not captured on a job. Nothing you
            do here is recorded. <Link href="/learn">Leave demo</Link> · <Link href="/readiness?demo=1">Manager view</Link>
          </div>
        ) : null}
        {learner.eventsUnconfirmed ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            Your practice history could not be read, so variant timing is unknown for this page load.
          </div>
        ) : null}
      </header>

      {!demo ? (
        <section className="card col gap-16" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div>
            <div className="h2">Ask ACT</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Answers come from reviewed cases and citations. Live job instructions are refused.
            </div>
          </div>
          <form className="row gap-8 wrap" action="/learn">
            <input type="hidden" name="q" value={q} />
            <input
              name="ask"
              defaultValue={ask}
              placeholder="Ask about a published case, callback pattern, or safety boundary..."
              style={{ minWidth: 280, flex: 1 }}
            />
            <button type="submit" className="primary">Ask published library</button>
          </form>

          {askError ? (
            <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
              {askError}
            </div>
          ) : null}

          {answer ? (
            <div
              className="notice col gap-8"
              style={{
                background: answer.refusal_reason ? 'var(--caution-tint)' : 'var(--surface-alt)',
                borderColor: answer.refusal_reason ? 'var(--caution)' : 'var(--border)',
              }}
            >
              <div>{answer.answer}</div>
              {answer.citations.length > 0 ? (
                <div className="col gap-8">
                  <div className="evidence-key">Sources</div>
                  <div className="row gap-8 wrap">
                    {answer.citations.map((citation) => (
                      <span key={citation.card_id} className="pill">{citation.title}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="col gap-16">
        <form className="row gap-8 wrap" action="/learn">
          {demo ? <input type="hidden" name="demo" value="1" /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search symptom, equipment, or case..."
            style={{ maxWidth: 520 }}
          />
          <button type="submit">Search cases</button>
          {q ? <Link href={base}>Clear</Link> : null}
        </form>

        {error ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            {error}
          </div>
        ) : null}

        <div className="row between wrap">
          <div className="h2">Published cases</div>
          <div className="muted">{ordered.length} cases</div>
        </div>

        {ordered.length === 0 ? (
          <div className="empty">
            {q
              ? 'No published cases match that search.'
              : 'No published HVAC cases yet. Capture a high-value episode, debrief it, and publish before apprentices can practice.'}
          </div>
        ) : (
          <div className="col gap-16">
            {ordered.map((card) => (
              <CaseBlock
                key={card.id}
                card={card}
                schedule={schedules.get(card.id)}
                record={!demo}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function matches(card: KnowledgeObjectOut, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [card.title, card.situation, card.observable_cue, card.decision, ...(card.tags_json ?? [])]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle));
}

function isDue(schedule: VariantSchedule | undefined): boolean {
  return schedule?.status === 'due' || schedule?.status === 'overdue';
}

/** Due variants first, then untouched cases, then waiting, then done. */
function rank(schedule: VariantSchedule | undefined): number {
  switch (schedule?.status) {
    case 'overdue':
      return 0;
    case 'due':
      return 1;
    case 'not_started':
    case undefined:
      return 2;
    case 'waiting':
      return 3;
    case 'done':
      return 4;
  }
}

function CaseBlock({
  card,
  schedule,
  record,
}: {
  card: KnowledgeObjectOut;
  schedule: VariantSchedule | undefined;
  record: boolean;
}) {
  const diag = diagnosticCaseFromKnowledgeObject(card);
  const due = isDue(schedule);
  return (
    <div className="col gap-16">
      <div className="row gap-8 wrap">
        <span className="pill">{EPISODE_LABEL[diag.episodeType]}</span>
        {card.status === 'published' && card.published_at ? (
          <span className="pill success">company-approved</span>
        ) : null}
        {schedule && schedule.status !== 'not_started' ? (
          <span className={`pill ${due ? 'warn' : ''}`}>
            {VARIANT_STATUS_LABEL[schedule.status]}
            {schedule.status === 'waiting' && schedule.dueAt ? ` · ${shortDate(schedule.dueAt)}` : ''}
          </span>
        ) : null}
      </div>
      <CasePractice card={card} variant={due} record={record} />
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
