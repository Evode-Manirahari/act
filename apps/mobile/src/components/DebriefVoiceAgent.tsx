/**
 * DebriefVoiceAgent — the turn-based voice debrief, in the field.
 *
 * Drives the backend agent: ACT speaks a question, the expert answers out loud,
 * the answer is transcribed + written back, and the agent generates the next
 * follow-up until the interview is complete. This runs AFTER the job — it is an
 * interview, never a real-time instruction in the tech's ear.
 *
 * Self-contained: owns its own audio (expo-av record + play) and API calls so it
 * can drop into the review flow for an approved moment without threading state
 * through the screen. The answers it writes feed the existing compile/publish.
 *
 *   advance() -> POST /moments/{id}/debrief/next?speak=true
 *      -> play question_audio_url, record answer, submitExpertAudioAnswer
 *      -> advance() again ... until { complete: true }.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';

import {
  debriefNext,
  submitExpertAudioAnswer,
  type DebriefTurn,
} from '../api/libraryApi';
import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

type Phase =
  | 'idle'
  | 'asking'
  | 'await_answer'
  | 'recording'
  | 'submitting'
  | 'complete'
  | 'error';

type QA = { question: string; answer: string };

type Props = {
  momentId: string;
  /** Stamped onto the ExpertAnswer when known (the recording's tech). */
  expertUserId?: string | null;
  /** Fired once the interview reports complete, so the screen can refresh. */
  onComplete?: () => void;
};

export default function DebriefVoiceAgent({ momentId, expertUserId, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [turn, setTurn] = useState<DebriefTurn | null>(null);
  const [log, setLog] = useState<QA[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Release audio on unmount.
  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => undefined);
      void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, []);

  async function playQuestion(url: string | null) {
    // local:// keys (no object storage configured) aren't playable; the
    // question text is always shown, so speaking is purely additive.
    if (!url || !/^https?:/.test(url)) return;
    try {
      await soundRef.current?.unloadAsync().catch(() => undefined);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
    } catch {
      // Best-effort playback — never block the interview on TTS.
    }
  }

  async function advance() {
    setError(null);
    setPhase('asking');
    try {
      const next = await debriefNext(momentId, { speak: true });
      setTurn(next);
      if (next.complete) {
        setPhase('complete');
        onComplete?.();
        return;
      }
      void playQuestion(next.question_audio_url);
      setPhase('await_answer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the debrief.');
      setPhase('error');
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is required for the voice debrief.');
        return;
      }
      await soundRef.current?.stopAsync().catch(() => undefined);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setPhase('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording.');
    }
  }

  async function stopAndSubmit() {
    const rec = recordingRef.current;
    const current = turn;
    if (!rec || !current?.question_id) return;
    setPhase('submitting');
    setError(null);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) throw new Error('Answer did not save.');
      const answer = await submitExpertAudioAnswer({
        questionId: current.question_id,
        uri,
        expertUserId: expertUserId ?? null,
      });
      setLog((prev) => [
        ...prev,
        { question: current.question ?? '', answer: answer.transcript ?? '' },
      ]);
      await advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the answer.');
      setPhase('await_answer'); // keep the question up so they can retry
    }
  }

  const recording = phase === 'recording';
  const working = phase === 'asking' || phase === 'submitting';

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>🎙 Voice debrief · ACT asks</Text>
        {turn && phase !== 'idle' && phase !== 'complete' ? (
          <Text style={styles.turnPill}>
            {Math.min(turn.turn, turn.max_turns)}/{turn.max_turns}
          </Text>
        ) : null}
      </View>

      {/* Answered turns so far. */}
      {log.map((qa, i) => (
        <View key={i} style={styles.qaRow}>
          <Text style={styles.qaQuestion}>Q{i + 1} · {qa.question}</Text>
          <Text style={styles.qaAnswer}>{qa.answer || '(no transcript)'}</Text>
        </View>
      ))}

      {phase === 'idle' ? (
        <>
          <Text style={styles.lede}>
            ACT will ask a few short questions about this moment and listen to
            the expert's answers — one at a time, after the job.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void advance()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Start voice debrief</Text>
          </Pressable>
        </>
      ) : null}

      {(phase === 'await_answer' || phase === 'recording') && turn ? (
        <>
          <Text style={styles.currentQuestion}>{turn.question}</Text>
          {turn.reason ? <Text style={styles.reason}>Why: {turn.reason}</Text> : null}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void playQuestion(turn.question_audio_url)}
              disabled={!turn.question_audio_url}
              style={({ pressed }) => [
                styles.replayButton,
                pressed && styles.pressed,
                !turn.question_audio_url && styles.disabled,
              ]}
            >
              <Text style={styles.replayText}>▶ Replay</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => (recording ? void stopAndSubmit() : void startRecording())}
              style={({ pressed }) => [
                styles.recordButton,
                recording && styles.recordButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.recordText, recording && styles.recordTextActive]}>
                {recording ? '■ Stop & submit answer' : '● Record answer'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {working ? (
        <View style={styles.workingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.workingText}>
            {phase === 'asking' ? 'ACT is thinking of the next question…' : 'Transcribing the answer…'}
          </Text>
        </View>
      ) : null}

      {phase === 'complete' ? (
        <View style={styles.doneBand}>
          <Text style={styles.doneTitle}>Debrief complete</Text>
          <Text style={styles.doneBody}>
            {log.length} answer{log.length === 1 ? '' : 's'} captured. Compile the
            card below to turn this into a training object.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {phase === 'error' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void advance()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { ...labelStyle, color: colors.primary, fontSize: 11 },
  turnPill: {
    fontFamily: fonts.monoSemibold,
    fontSize: 12,
    color: colors.primary,
  },
  lede: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  qaRow: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 3,
  },
  qaQuestion: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.steel700,
  },
  qaAnswer: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  currentQuestion: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  reason: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  replayButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  replayText: { color: colors.steel700, fontFamily: fonts.bold, fontSize: 13 },
  recordButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  recordButtonActive: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  recordText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
  recordTextActive: { color: colors.error },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  workingText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 },
  doneBand: {
    borderRadius: 8,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    padding: 12,
    gap: 3,
  },
  doneTitle: { fontFamily: fonts.bold, fontSize: 14, color: '#065F46' },
  doneBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
  error: {
    color: colors.error,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
