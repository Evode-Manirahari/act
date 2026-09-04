import { api, type KnowledgeObjectOut, type LibraryAskResponse } from '@/lib/api';
import CasePractice from '@/components/CasePractice';
import { EPISODE_LABEL, diagnosticCaseFromKnowledgeObject } from '@act/domain';

export const dynamic = 'force-dynamic';

interface SearchParamsShape {
  q?: string;
  ask?: string;
  preview?: string;
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const ask = sp.ask?.trim() ?? '';
  const preview =
    process.env.NODE_ENV !== 'production' && sp.preview === '1';
  let cards: KnowledgeObjectOut[] = preview ? [PREVIEW_CASE] : [];
  let answer: LibraryAskResponse | null = null;
  let error: string | null = null;
  let askError: string | null = null;

  try {
    if (!preview) {
      cards = await api.library(q, 'hvac');
    }
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
            <h1 className="h1">Diagnostic cases</h1>
            <div className="muted">
              Practice the decision before you see what the senior did. Published cases only.
            </div>
            {preview ? (
              <div className="notice" style={{ background: 'var(--caution-tint)', borderColor: 'var(--caution)' }}>
                Preview fixture — not a field case, not production evidence.
              </div>
            ) : null}
          </div>
          <span className="pill success">company-approved library</span>
        </div>
      </header>

      <section className="card col gap-16" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="row between wrap gap-16">
          <div>
            <div className="h2">Ask ACT</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Answers come from reviewed cases and citations. Live job instructions are refused.
            </div>
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

      <section className="col gap-16">
        <form className="row gap-8 wrap" action="/learn">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search symptom, equipment, or case..."
            style={{ maxWidth: 520 }}
          />
          <button type="submit">Search cases</button>
        </form>

        {error ? (
          <div className="notice" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
            {error}
          </div>
        ) : null}

        <div className="row between wrap">
          <div className="h2">Published cases</div>
          <div className="muted">{cards.length} cases</div>
        </div>

        {cards.length === 0 ? (
          <div className="empty">
            No published HVAC cases yet. Capture a high-value episode, debrief it, and publish
            before apprentices can practice.
          </div>
        ) : (
          <div className="col gap-16">
            {cards.map((card) => (
              <CaseBlock key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CaseBlock({ card }: { card: KnowledgeObjectOut }) {
  const diag = diagnosticCaseFromKnowledgeObject(card);
  return (
    <div className="col gap-16">
      <div className="row gap-8 wrap">
        <span className="pill">{EPISODE_LABEL[diag.episodeType]}</span>
        {card.status === 'published' && card.published_at ? (
          <span className="pill success">company-approved</span>
        ) : null}
      </div>
      <CasePractice card={card} />
    </div>
  );
}

/** Local-dev only. Never counted as a field episode. */
const PREVIEW_CASE: KnowledgeObjectOut = {
  id: 'preview-not-a-field-case',
  moment_id: 'preview-moment',
  title: 'PREVIEW — airflow before charge',
  trade: 'hvac',
  situation: 'Residential no-cool. Outdoor unit cycles. Filter looks dirty from the hallway.',
  observable_cue: 'Weak return airflow at the grille; suction line frosting after a few minutes.',
  expert_reasoning: 'Restriction can mimic low charge. Confirm airflow before adding refrigerant.',
  decision: 'Measure static pressure and restore airflow, then recheck the split.',
  novice_trap: 'Adding refrigerant first because the suction line is cold.',
  safety_boundary: 'Isolate power before opening the blower compartment.',
  verification: 'After airflow is restored, split, superheat, and subcooling sit in spec across a full cycle.',
  quiz_json: null,
  tags_json: ['callback', 'airflow'],
  status: 'published',
  created_by: null,
  published_at: '2026-08-01T00:00:00.000Z',
  created_at: '2026-08-01T00:00:00.000Z',
};

