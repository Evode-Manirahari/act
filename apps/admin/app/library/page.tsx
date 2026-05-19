import { api } from '@/lib/api';


export const dynamic = 'force-dynamic';


interface SearchParamsShape {
  q?: string;
  trade?: string;
}


export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const trade = sp.trade ?? '';
  let cards: Awaited<ReturnType<typeof api.library>> = [];
  let error: string | null = null;
  try {
    cards = await api.library(q, trade);
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown error';
  }

  return (
    <div className="col gap-24">
      <header className="col gap-8">
        <h1 className="h1">Apprentice library</h1>
        <div className="muted">
          Published knowledge objects an apprentice can search and learn from.
        </div>
      </header>

      <form className="row gap-8 wrap" action="/library">
        <input
          name="q"
          defaultValue={q}
          placeholder="search by title, situation, novice trap, or tag…"
          style={{ maxWidth: 480 }}
        />
        <select name="trade" defaultValue={trade} style={{ maxWidth: 200 }}>
          <option value="">All trades</option>
          <option value="hvac">HVAC</option>
          <option value="electrical">Electrical</option>
        </select>
        <button type="submit" className="primary">Search</button>
      </form>

      {error && (
        <div className="notice" style={{ color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          No published cards match. Approve a moment, draft a question, capture
          an expert answer, then compile + publish a card to see it here.
        </div>
      ) : (
        <div className="col gap-16">
          {cards.map((c) => (
            <article key={c.id} className="card col gap-8">
              <div className="row between wrap">
                <div className="h2">{c.title}</div>
                <span className="pill success">published</span>
              </div>
              <div className="row gap-8 wrap muted" style={{ fontSize: 12 }}>
                <span className="pill">{c.trade}</span>
                {c.tags_json?.map((t) => <span key={t} className="pill">{t}</span>)}
              </div>
              {c.situation && (
                <div>
                  <div className="evidence-key">Situation</div>
                  <div className="evidence-value">{c.situation}</div>
                </div>
              )}
              {c.novice_trap && (
                <div>
                  <div className="evidence-key">Novice trap</div>
                  <div className="evidence-value">{c.novice_trap}</div>
                </div>
              )}
              {c.quiz_json && (
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    Quiz
                  </summary>
                  <div style={{ marginTop: 8 }}>
                    <div>{c.quiz_json.question}</div>
                    <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                      {c.quiz_json.choices.map((choice) => (
                        <li key={choice}>
                          {choice}
                          {choice === c.quiz_json?.answer && (
                            <span className="muted" style={{ marginLeft: 6 }}>✓ correct</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
