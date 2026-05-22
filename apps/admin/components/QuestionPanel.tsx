'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { ElicitationQuestionOut, ExpertAnswerOut, KnowledgeObjectOut } from '@/lib/api';
import AudioAnswerRecorder from './AudioAnswerRecorder';


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
        <QuestionCard
          key={q.id}
          question={q}
          isActive={activeId === q.id}
          onUseThis={() => setActiveId(q.id)}
          onSaved={(updated) =>
            setQuestions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }
        />
      ))}

      {activeQuestion && activeQuestion.status !== 'answered' && (
        <div className="card col gap-8">
          <strong>Capture the expert&apos;s answer</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            Record the expert speaking, or paste a written transcript.
          </div>

          <AudioAnswerRecorder
            questionId={activeQuestion.id}
            onAnswered={(savedAnswer: ExpertAnswerOut) => {
              // Audio path persisted the answer + flipped status on the
              // server. Mirror that in local state so compile lights up.
              setQuestions((prev) =>
                prev.map((q) =>
                  q.id === activeQuestion.id ? { ...q, status: 'answered' } : q,
                ),
              );
              if (savedAnswer.transcript) {
                setAnswer(savedAnswer.transcript);
              }
              router.refresh();
            }}
          />

          <div className="evidence-key">Typed transcript (override)</div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="…or paste / type a transcript here and click Save."
          />
          <div className="row gap-8">
            <button className="primary" onClick={submitAnswer} disabled={!answer.trim() || isPending}>
              Save typed answer
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

      {card && (
        <CardEditor
          card={card}
          onSaved={(updated) => setCard(updated)}
        />
      )}
      {error && <div className="notice" style={{ color: 'var(--error)' }}>{error}</div>}
    </div>
  );
}


function QuestionCard({
  question,
  isActive,
  onUseThis,
  onSaved,
}: {
  question: ElicitationQuestionOut;
  isActive: boolean;
  onUseThis: () => void;
  onSaved: (updated: ElicitationQuestionOut) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.question);
  const [reason, setReason] = useState(question.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ question: text.trim(), reason: reason.trim() }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const updated = (await response.json()) as ElicitationQuestionOut;
      onSaved(updated);
      setEditing(false);
    });
  }

  function cancel() {
    setText(question.question);
    setReason(question.reason ?? '');
    setEditing(false);
    setError(null);
  }

  return (
    <div className="card col gap-8">
      <div className="row between">
        <span className="pill">{question.status.replace(/_/g, ' ')}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {new Date(question.created_at).toLocaleString()}
        </span>
      </div>
      {editing ? (
        <div className="col gap-8">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div className="row gap-8">
            <button className="primary" onClick={save} disabled={!text.trim() || isPending}>
              Save
            </button>
            <button className="ghost" onClick={cancel} disabled={isPending}>
              Cancel
            </button>
          </div>
          {error && (
            <div className="notice" style={{ color: 'var(--error)' }}>{error}</div>
          )}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 15 }}>
            <strong>Q.</strong> {question.question}
          </div>
          {question.reason && (
            <div className="muted" style={{ fontSize: 12 }}>{question.reason}</div>
          )}
          <div className="row gap-8">
            {question.status !== 'answered' && (
              <button onClick={onUseThis} className="ghost">
                {isActive ? 'Active' : 'Use this question'}
              </button>
            )}
            {question.status !== 'answered' && (
              <button onClick={() => setEditing(true)} className="ghost">
                Edit
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}


type EditableField =
  | 'title'
  | 'situation'
  | 'observable_cue'
  | 'expert_reasoning'
  | 'decision'
  | 'novice_trap'
  | 'safety_boundary'
  | 'verification';


const EDITABLE_LABELS: Array<{ key: EditableField; label: string }> = [
  { key: 'title', label: 'Title' },
  { key: 'situation', label: 'Situation' },
  { key: 'observable_cue', label: 'Observable cue' },
  { key: 'expert_reasoning', label: 'Expert reasoning' },
  { key: 'decision', label: 'Decision' },
  { key: 'novice_trap', label: 'Novice trap' },
  { key: 'safety_boundary', label: 'Safety boundary' },
  { key: 'verification', label: 'Verification' },
];


function CardEditor({
  card,
  onSaved,
}: {
  card: KnowledgeObjectOut;
  onSaved: (updated: KnowledgeObjectOut) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<EditableField, string>>(() => ({
    title: card.title,
    situation: card.situation ?? '',
    observable_cue: card.observable_cue ?? '',
    expert_reasoning: card.expert_reasoning ?? '',
    decision: card.decision ?? '',
    novice_trap: card.novice_trap ?? '',
    safety_boundary: card.safety_boundary ?? '',
    verification: card.verification ?? '',
  }));
  const [tags, setTags] = useState((card.tags_json ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = { tags_json: tagList };
      for (const { key } of EDITABLE_LABELS) {
        body[key] = draft[key];
      }
      const response = await fetch(`/api/knowledge-objects/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const updated = (await response.json()) as KnowledgeObjectOut;
      onSaved(updated);
      setEditing(false);
    });
  }

  function cancel() {
    setDraft({
      title: card.title,
      situation: card.situation ?? '',
      observable_cue: card.observable_cue ?? '',
      expert_reasoning: card.expert_reasoning ?? '',
      decision: card.decision ?? '',
      novice_trap: card.novice_trap ?? '',
      safety_boundary: card.safety_boundary ?? '',
      verification: card.verification ?? '',
    });
    setTags((card.tags_json ?? []).join(', '));
    setEditing(false);
    setError(null);
  }

  return (
    <div className="card col gap-8">
      <div className="row between wrap">
        <div className="h2">{editing ? 'Editing card' : card.title}</div>
        <div className="row gap-8">
          <span className="pill">{card.status}</span>
          {!editing && (
            <button className="ghost" onClick={() => setEditing(true)}>
              Edit card
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="col gap-8">
          {EDITABLE_LABELS.map(({ key, label }) => (
            <div key={key} className="col" style={{ gap: 4 }}>
              <div className="evidence-key">{label}</div>
              {key === 'title' ? (
                <input
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
              ) : (
                <textarea
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  rows={3}
                />
              )}
            </div>
          ))}
          <div className="col" style={{ gap: 4 }}>
            <div className="evidence-key">Tags (comma-separated)</div>
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="row gap-8">
            <button
              className="primary"
              onClick={save}
              disabled={!draft.title.trim() || isPending}
            >
              Save changes
            </button>
            <button className="ghost" onClick={cancel} disabled={isPending}>
              Cancel
            </button>
          </div>
          {error && (
            <div className="notice" style={{ color: 'var(--error)' }}>{error}</div>
          )}
        </div>
      ) : (
        <>
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
        </>
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
