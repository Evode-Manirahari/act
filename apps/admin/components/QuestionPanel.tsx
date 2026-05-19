'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { ElicitationQuestionOut, KnowledgeObjectOut } from '@/lib/api';


interface Props {
  momentId: string;
  initialQuestions: ElicitationQuestionOut[];
  momentApproved: boolean;
}

export default function QuestionPanel({
  momentId,
  initialQuestions,
  momentApproved,
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [answer, setAnswer] = useState('');
  const [activeId, setActiveId] = useState<string | null>(
    initialQuestions.find((q) => q.status !== 'answered')?.id ?? null,
  );
  const [card, setCard] = useState<KnowledgeObjectOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function generate() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/moments/${momentId}/generate-question`, {
        method: 'POST',
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const newQ = (await response.json()) as ElicitationQuestionOut;
      setQuestions((prev) => [newQ, ...prev]);
      setActiveId(newQ.id);
      router.refresh();
    });
  }

  function submitAnswer() {
    if (!activeId || !answer.trim()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/questions/${activeId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ transcript: answer }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      setAnswer('');
      setQuestions((prev) =>
        prev.map((q) => (q.id === activeId ? { ...q, status: 'answered' } : q)),
      );
      router.refresh();
    });
  }

  function compile() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/moments/${momentId}/compile`, {
        method: 'POST',
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const ko = (await response.json()) as KnowledgeObjectOut;
      setCard(ko);
      router.refresh();
    });
  }

  function publish() {
    if (!card) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/knowledge-objects/${card.id}/publish`, {
        method: 'POST',
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const updated = (await response.json()) as KnowledgeObjectOut;
      setCard(updated);
      router.refresh();
    });
  }

  const activeQuestion = questions.find((q) => q.id === activeId);
  const hasAnsweredQuestion = questions.some((q) => q.status === 'answered');

  return (
    <div className="col gap-16">
      <div className="row between wrap">
        <div className="h2">Expert interview</div>
        <button onClick={generate} disabled={isPending}>
          {questions.length === 0 ? 'Draft a question' : 'Draft another question'}
        </button>
      </div>

      {questions.length === 0 && (
        <div className="empty">
          No questions drafted yet. Click <strong>Draft a question</strong> to have Claude write one for you.
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id} className="card col gap-8">
          <div className="row between">
            <span className="pill">{q.status.replace(/_/g, ' ')}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {new Date(q.created_at).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: 15 }}>
            <strong>Q.</strong> {q.question}
          </div>
          {q.reason && <div className="muted" style={{ fontSize: 12 }}>{q.reason}</div>}
          {q.status !== 'answered' && (
            <button onClick={() => setActiveId(q.id)} className="ghost">
              {activeId === q.id ? 'Active' : 'Use this question'}
            </button>
          )}
        </div>
      ))}

      {activeQuestion && activeQuestion.status !== 'answered' && (
        <div className="card col gap-8">
          <strong>Record the expert&apos;s answer (transcript)</strong>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Paste the transcribed answer here, or type what the expert said."
          />
          <div className="row gap-8">
            <button className="primary" onClick={submitAnswer} disabled={!answer.trim() || isPending}>
              Save answer
            </button>
          </div>
        </div>
      )}

      {hasAnsweredQuestion && (
        <div className="card col gap-8">
          <strong>Compile training card</strong>
          {!momentApproved && (
            <div className="notice" style={{ color: 'var(--warn)' }}>
              Approve the moment first to enable compilation.
            </div>
          )}
          <div className="row gap-8 wrap">
            <button
              className="primary"
              onClick={compile}
              disabled={!momentApproved || isPending}
            >
              Compile with Claude
            </button>
            {card && (
              <button
                className="success"
                onClick={publish}
                disabled={isPending || card.status === 'published'}
              >
                {card.status === 'published' ? 'Published' : 'Publish to apprentice library'}
              </button>
            )}
          </div>
        </div>
      )}

      {card && <CardPreview card={card} />}
      {error && <div className="notice" style={{ color: 'var(--error)' }}>{error}</div>}
    </div>
  );
}


function CardPreview({ card }: { card: KnowledgeObjectOut }) {
  return (
    <div className="card col gap-8">
      <div className="row between wrap">
        <div className="h2">{card.title}</div>
        <span className="pill">{card.status}</span>
      </div>
      {card.tags_json && card.tags_json.length > 0 && (
        <div className="row gap-8 wrap">
          {card.tags_json.map((t) => (
            <span key={t} className="pill">{t}</span>
          ))}
        </div>
      )}
      <Field label="Situation" value={card.situation} />
      <Field label="Observable cue" value={card.observable_cue} />
      <Field label="Expert reasoning" value={card.expert_reasoning} />
      <Field label="Decision" value={card.decision} />
      <Field label="Novice trap" value={card.novice_trap} />
      <Field label="Safety boundary" value={card.safety_boundary} />
      <Field label="Verification" value={card.verification} />
      {card.quiz_json && (
        <div className="col gap-8">
          <div className="evidence-key">Quiz</div>
          <div>{card.quiz_json.question}</div>
          <ul style={{ paddingLeft: 20 }}>
            {card.quiz_json.choices.map((c) => (
              <li key={c} style={{ fontWeight: c === card.quiz_json?.answer ? 700 : 400 }}>
                {c} {c === card.quiz_json?.answer && '✓'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="evidence-key">{label}</div>
      <div className="evidence-value">{value}</div>
    </div>
  );
}
