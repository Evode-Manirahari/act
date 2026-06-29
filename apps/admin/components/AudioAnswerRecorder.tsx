'use client';

import { useEffect, useRef, useState } from 'react';

import type { ExpertAnswerOut } from '@/lib/api';


type RecorderState =
  | { kind: 'idle' }
  | { kind: 'permission_denied' }
  | { kind: 'recording'; seconds: number }
  | { kind: 'uploading' }
  | { kind: 'transcribed'; answer: ExpertAnswerOut }
  | { kind: 'error'; message: string };


interface Props {
  questionId: string;
  onAnswered: (answer: ExpertAnswerOut) => void;
}


/**
 * Browser-side voice recorder for the expert interview flow.
 *
 * Wraps MediaRecorder, posts the resulting Blob to the Next route
 * handler proxy, and surfaces the server-side transcript. The
 * captured audio is stored on the server alongside the transcript so
 * the reviewer can replay if Deepgram mis-transcribed a key word.
 */
export default function AudioAnswerRecorder({ questionId, onAnswered }: Props) {
  const [state, setState] = useState<RecorderState>({ kind: 'idle' });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount — stop the mic immediately if the user navigates
  // away mid-recording.
  useEffect(() => {
    return () => {
      stopTick();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopTick() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function startRecording() {
    if (state.kind === 'recording' || state.kind === 'uploading') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickSupportedMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void uploadRecording();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setState({ kind: 'recording', seconds: 0 });
      tickRef.current = setInterval(() => {
        setState({
          kind: 'recording',
          seconds: (Date.now() - startedAtRef.current) / 1000,
        });
      }, 200);
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      ) {
        setState({ kind: 'permission_denied' });
      } else {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'mic error',
        });
      }
    }
  }

  function stopRecording() {
    if (state.kind !== 'recording') return;
    stopTick();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState({ kind: 'uploading' });
  }

  async function uploadRecording() {
    try {
      const mime =
        mediaRecorderRef.current?.mimeType ||
        chunksRef.current[0]?.type ||
        'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size === 0) {
        setState({ kind: 'error', message: 'no audio captured' });
        return;
      }

      const form = new FormData();
      form.append('audio', blob, `answer.${guessExt(mime)}`);

      const response = await fetch(`/api/questions/${questionId}/audio-answer`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) {
        setState({
          kind: 'error',
          message: `${response.status}: ${await response.text()}`,
        });
        return;
      }
      const answer = (await response.json()) as ExpertAnswerOut;
      setState({ kind: 'transcribed', answer });
      onAnswered(answer);
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'upload failed',
      });
    }
  }

  function reset() {
    chunksRef.current = [];
    setState({ kind: 'idle' });
  }

  return (
    <div className="col gap-8">
      <div className="row gap-8 wrap" style={{ alignItems: 'center' }}>
        {state.kind === 'recording' ? (
          <>
            <button className="danger" onClick={stopRecording} type="button">
              ■ Stop &amp; transcribe
            </button>
            <span className="mono muted">{formatSeconds(state.seconds)}</span>
            <span className="pill" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              recording
            </span>
          </>
        ) : state.kind === 'uploading' ? (
          <>
            <button disabled type="button">
              Transcribing…
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Uploading audio &amp; running Deepgram.
            </span>
          </>
        ) : state.kind === 'transcribed' ? (
          <>
            <button type="button" onClick={reset}>
              Re-record
            </button>
            <span className="pill" style={{ background: 'var(--success-bg)', borderColor: 'var(--success)', color: '#065F46' }}>
              transcribed
            </span>
          </>
        ) : (
          <button type="button" className="primary" onClick={startRecording}>
            🎙 Record expert&apos;s answer
          </button>
        )}
      </div>

      {state.kind === 'permission_denied' && (
        <div className="notice" style={{ color: 'var(--error)' }}>
          Microphone permission was denied. Allow it in your browser and try
          again, or use the typed answer above.
        </div>
      )}

      {state.kind === 'error' && (
        <div className="notice" style={{ color: 'var(--error)' }}>
          {state.message}
        </div>
      )}

      {state.kind === 'transcribed' && (
        <TranscriptCorrection
          answer={state.answer}
          onUpdated={(updated) => setState({ kind: 'transcribed', answer: updated })}
        />
      )}
    </div>
  );
}


function TranscriptCorrection({
  answer,
  onUpdated,
}: {
  answer: ExpertAnswerOut;
  onUpdated: (updated: ExpertAnswerOut) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer.transcript ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/answers/${answer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ transcript: draft }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError(await response.text());
        return;
      }
      const updated = (await response.json()) as ExpertAnswerOut;
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(answer.transcript ?? '');
    setEditing(false);
    setError(null);
  }

  return (
    <div className="col gap-8">
      <div className="evidence-key">Transcript (Deepgram)</div>
      {editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
          <div className="row gap-8">
            <button
              type="button"
              className="primary"
              onClick={save}
              disabled={!draft.trim() || saving}
            >
              {saving ? 'Saving…' : 'Save correction'}
            </button>
            <button type="button" className="ghost" onClick={cancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ background: 'var(--surface-alt)' }}>
            {answer.transcript || (
              <span className="muted">
                Deepgram returned no transcript. Audio was saved at{' '}
                <span className="mono">{answer.audio_key}</span> — re-record or type below.
              </span>
            )}
          </div>
          <div className="row gap-8">
            <button type="button" className="ghost" onClick={() => setEditing(true)}>
              Fix transcript
            </button>
          </div>
        </>
      )}
      {error && (
        <div className="notice" style={{ color: 'var(--error)' }}>
          {error}
        </div>
      )}
      <div className="muted" style={{ fontSize: 12 }}>
        Recorded answer saved as an answered question. Fix transcript inline,
        or re-record to overwrite with a new audio file.
      </div>
    </div>
  );
}


function pickSupportedMime(): string | undefined {
  // Chrome/Edge: audio/webm;codecs=opus. Safari: audio/mp4. We let
  // MediaRecorder pick if none of these are supported.
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported?.(mime)) return mime;
  }
  return undefined;
}


function guessExt(mime: string): string {
  const base = mime.split(';', 1)[0].trim().toLowerCase();
  if (base.includes('webm')) return 'webm';
  if (base.includes('ogg')) return 'ogg';
  if (base.includes('mp4')) return 'mp4';
  if (base.includes('wav')) return 'wav';
  return 'webm';
}


function formatSeconds(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
