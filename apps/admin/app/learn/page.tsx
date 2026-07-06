import { api, type KnowledgeObjectOut, type LibraryAskResponse } from '@/lib/api';


export const dynamic = 'force-dynamic';


interface SearchParamsShape {
  q?: string;
  ask?: string;
}


export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const ask = sp.ask?.trim() ?? '';
  let cards: KnowledgeObjectOut[] = [];
  let answer: LibraryAskResponse | null = null;
  let error: string | null = null;
  let askError: string | null = null;

  try {
    cards = await api.library(q, 'hvac');
  } catch (e) {
    error = e instanceof Error ? e.message : 'library failed';
  }

  if (ask) {
    try {
      answer = await api.askLibrary({ query: ask, trade: 'hvac', limit: 3 });
    } catch (e) {
      askError = e instanceof Error ? e.message : 'Ask ACT failed';
    }
  }

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <div className="row between wrap gap-16">
          <div>
            <h1 className="h1">Apprentice lessons</h1>
            <div className="muted">
              Web training cards from reviewed HVAC jobs. Published cards only.
            </div>
          </div>
          <span className="pill success">company-approved library</span>
        </div>
      </header>

      <section className="card col gap-16" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="row between wrap gap-16">
          <div>
            <div className="h2">Ask ACT</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Answers come from reviewed cards and citations. Live job instructions are refused.
            </div>
          </div>
          <span className="pill">Agent 9</span>
        </div>
        <form className="row gap-8 wrap" action="/learn">
          <input type="hidden" name="q" value={q} />
          <input
            name="ask"
            defaultValue={ask}
            placeholder="Ask about airflow traps, callbacks, safety boundaries..."
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
              background: answer.refusal_reason ? 'var(--warn-bg)' : 'var(--surface-alt)',
              borderColor: answer.refusal_reason ? 'var(--warn)' : 'var(--border)',
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

      <section className="col gap-16">
        <form className="row gap-8 wrap" action="/learn">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search symptom, equipment, novice trap, or tag..."
            style={{ maxWidth: 520 }}
          />
          <button type="submit">Search lessons</button>
        </form>

        {error ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            {error}
          </div>
        ) : null}

        <div className="row between wrap">
          <div className="h2">Published training cards</div>
          <div className="muted">{cards.length} cards</div>
        </div>

        {cards.length === 0 ? (
          <div className="empty">
            No published HVAC cards yet. Capture, approve, debrief, compile, and publish
            one card to give apprentices a web lesson.
          </div>
        ) : (
          <div className="col gap-16">
            {cards.map((card) => (
              <LessonCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


function LessonCard({ card }: { card: KnowledgeObjectOut }) {
  return (
    <article className="card col gap-16">
      <div className="row between wrap gap-16">
        <div className="col gap-8">
          <div className="h2">{card.title}</div>
          <div className="row gap-8 wrap">
            <span className="pill">{card.trade}</span>
            {isCompanyApproved(card) ? <span className="pill success">company-approved</span> : null}
            {card.tags_json?.slice(0, 4).map((tag) => <span key={tag} className="pill">{tag}</span>)}
          </div>
        </div>
        <div className="mono muted" style={{ fontSize: 12 }}>
          card {card.id.slice(0, 8)}
        </div>
      </div>

      <div className="lesson-grid">
        <Field label="Situation" value={card.situation} />
        <Field label="Observable cue" value={card.observable_cue} />
        <Field label="Expert reasoning" value={card.expert_reasoning} />
        <Field label="Decision" value={card.decision} />
        <Field label="Verification" value={card.verification} />
      </div>

      {card.novice_trap ? (
        <div className="notice" style={{ background: 'var(--warn-bg)', borderColor: 'var(--warn)' }}>
          <div className="evidence-key">Novice trap</div>
          <div>{card.novice_trap}</div>
        </div>
      ) : null}

      {card.safety_boundary ? (
        <div className="notice" style={{ background: 'var(--error-bg)', borderColor: 'var(--error)' }}>
          <div className="evidence-key">Safety boundary</div>
          <div>{card.safety_boundary}</div>
        </div>
      ) : null}

      {card.quiz_json ? (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
            Quick check
          </summary>
          <div className="col gap-8" style={{ marginTop: 10 }}>
            <div>{card.quiz_json.question}</div>
            <div className="row gap-8 wrap">
              {card.quiz_json.choices.map((choice) => (
                <span
                  key={choice}
                  className={choice === card.quiz_json?.answer ? 'pill success' : 'pill'}
                >
                  {choice}
                </span>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </article>
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


function isCompanyApproved(card: KnowledgeObjectOut): boolean {
  return card.status === 'published' && card.published_at != null;
}
