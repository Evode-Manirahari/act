/**
 * DebriefScreen — the expert's side of the auto-chain.
 *
 * When a lead tech approves a moment, Agent 5 drafts one question and it
 * lands here. The senior tech answers in their own words — 30 seconds of
 * talking (recorded + transcribed server-side) or a typed note — and the
 * chain compiles the training card automatically. Answer → done; no other
 * buttons, because the tech is standing in a parking lot between calls.
 */
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';

import ActAppShell from '../components/ActAppShell';
import DebriefVoiceAgent from '../components/DebriefVoiceAgent';
import {
  getPendingDebrief,
  submitExpertAnswer,
  submitExpertAudioAnswer,
  type PendingDebriefItem,
} from '../api/libraryApi';
import { canSubmitDebriefAnswer, debriefSubmissionNotice } from './debriefModel';
import { ActButton, ActCard, ActEmptyState, ActInput, ActScreen, ActText, colors, radii, spacing } from '../design';

type SubmittedDebrief = {
  question: string;
  momentId: string;
};

export default function DebriefScreen() {
  const [items, setItems] = useState<PendingDebriefItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<SubmittedDebrief | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const refresh = useCallback(async () => {
    try {
      const pending = await getPendingDebrief();
      setItems(pending.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not load questions');
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        const activeRecording = recordingRef.current;
        if (activeRecording) {
          recordingRef.current = null;
          setRecording(null);
          void activeRecording.stopAndUnloadAsync().catch(() => undefined);
        }
        void Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        }).catch(() => undefined);
      };
    }, [refresh]),
  );

  function openQuestion(id: string) {
    setOpenId(id === openId ? null : id);
    setTranscript('');
    setAudioUri(null);
    setError(null);
  }

  async function toggleRecording() {
    setError(null);
    try {
      if (recording) {
        recordingRef.current = null;
        await recording.stopAndUnloadAsync();
        setAudioUri(recording.getURI());
        setRecording(null);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        return;
      }
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is needed to record an answer.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setAudioUri(null);
      recordingRef.current = rec;
      setRecording(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'recording failed');
      recordingRef.current = null;
      setRecording(null);
    }
  }

  async function submit(item: PendingDebriefItem) {
    if (!canSubmitDebriefAnswer({ transcript, audioUri, submitting })) return;
    setSubmitting(true);
    setError(null);
    try {
      if (audioUri) {
        await submitExpertAudioAnswer({ questionId: item.question_id, uri: audioUri });
      } else {
        await submitExpertAnswer({ questionId: item.question_id, transcript: transcript.trim() });
      }
      setLastSubmitted({ question: item.question, momentId: item.moment_id });
      setOpenId(null);
      setTranscript('');
      setAudioUri(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'answer failed to send');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = canSubmitDebriefAnswer({ transcript, audioUri, submitting });
  const submittedNotice = lastSubmitted ? debriefSubmissionNotice(lastSubmitted.question) : null;

  return (
    <ActAppShell mode="Debrief">
      <ActScreen keyboardShouldPersistTaps="handled">
        <ActText variant="label" color="textMuted">
          QUESTIONS FROM YOUR REVIEWED MOMENTS
        </ActText>

        {submittedNotice ? (
          <ActCard tone="ok" accent="ok">
            <ActText variant="label" color="success">
              {submittedNotice.title}
            </ActText>
            <ActText variant="body" weight="semibold" style={styles.noticeBody}>
              {submittedNotice.body}
            </ActText>
            {submittedNotice.detail ? (
              <ActText variant="small" color="steel700">
                {submittedNotice.detail}
              </ActText>
            ) : null}
            <ActText variant="small" mono color="textMuted" style={styles.noticeMeta}>
              MOMENT {lastSubmitted?.momentId.slice(0, 8)}
            </ActText>
          </ActCard>
        ) : null}

        {items === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <ActEmptyState
            title="Nothing waiting"
            body="When a reviewed moment gets a question, it shows up here. Answer in your own words — ACT builds the training card from it."
          />
        ) : (
          items.map((item) => (
            <ActCard key={item.question_id} accent={openId === item.question_id ? 'orange' : undefined}>
              <Pressable onPress={() => openQuestion(item.question_id)}>
                <ActText variant="body" weight="semibold">
                  {item.question}
                </ActText>
                {item.reason ? (
                  <ActText variant="small" color="textMuted" style={styles.reason}>
                    Why this matters: {item.reason}
                  </ActText>
                ) : null}
              </Pressable>

              {openId === item.question_id ? (
                <View style={styles.answerBlock}>
                  <DebriefVoiceAgent
                    momentId={item.moment_id}
                    expertUserId={item.recorded_by}
                    onComplete={() => {
                      setLastSubmitted({ question: item.question, momentId: item.moment_id });
                      setOpenId(null);
                      void refresh();
                    }}
                  />

                  <ActText variant="small" color="textMuted">
                    Quick answer to the drafted question:
                  </ActText>
                  <Pressable
                    style={[styles.recordButton, recording && styles.recordButtonLive]}
                    onPress={() => void toggleRecording()}
                    disabled={submitting}
                  >
                    <ActText variant="label" color={recording ? 'surface' : 'primary'}>
                      {recording ? '■ STOP RECORDING' : audioUri ? '● RE-RECORD ANSWER' : '● RECORD ANSWER'}
                    </ActText>
                  </Pressable>
                  {audioUri ? (
                    <ActText variant="small" color="success">
                      Recorded — ready to send. ACT transcribes it for you.
                    </ActText>
                  ) : null}

                  <ActText variant="small" color="textMuted">
                    or type it:
                  </ActText>
                  <ActInput
                    value={transcript}
                    onChangeText={setTranscript}
                    placeholder="What told you? What would a newer tech get wrong?"
                    multiline
                    editable={!submitting && !recording}
                  />

                  {error ? (
                    <ActText variant="small" color="error">
                      {error}
                    </ActText>
                  ) : null}

                  <ActButton
                    label={submitting ? 'Sending' : 'Send answer'}
                    onPress={() => void submit(item)}
                    disabled={!canSubmit}
                    loading={submitting}
                  />
                </View>
              ) : null}
            </ActCard>
          ))
        )}
      </ActScreen>
    </ActAppShell>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  noticeBody: { marginTop: spacing.xs },
  noticeMeta: { marginTop: spacing.sm },
  reason: { marginTop: spacing.xs },
  answerBlock: { marginTop: spacing.md, gap: spacing.sm },
  recordButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  recordButtonLive: { backgroundColor: colors.primary },
});
