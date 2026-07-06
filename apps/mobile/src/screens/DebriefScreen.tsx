/**
 * DebriefScreen — the expert's side of the auto-chain.
 *
 * When a lead tech approves a moment, Agent 5 drafts one question and it
 * lands here. The senior tech answers in their own words — 30 seconds of
 * talking (recorded + transcribed server-side) or a typed note — and the
 * chain compiles the training card automatically. Answer → done; no other
 * buttons, because the tech is standing in a parking lot between calls.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';

import ActAppShell from '../components/ActAppShell';
import {
  getPendingDebrief,
  submitExpertAnswer,
  submitExpertAudioAnswer,
  type PendingDebriefItem,
} from '../api/libraryApi';
import { canSubmitDebriefAnswer } from './debriefModel';
import { ActButton, ActCard, ActEmptyState, ActScreen, ActText, colors, radii, spacing } from '../design';

export default function DebriefScreen() {
  const [items, setItems] = useState<PendingDebriefItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await recording.stopAndUnloadAsync();
        setAudioUri(recording.getURI());
        setRecording(null);
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
      setRecording(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'recording failed');
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

  return (
    <ActAppShell mode="Debrief">
      <ActScreen keyboardShouldPersistTaps="handled">
        <ActText variant="label" color="textMuted">
          QUESTIONS FROM YOUR REVIEWED MOMENTS
        </ActText>

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
                  <TextInput
                    style={styles.input}
                    value={transcript}
                    onChangeText={setTranscript}
                    placeholder="What told you? What would a newer tech get wrong?"
                    placeholderTextColor={colors.textMuted}
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    minHeight: 88,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
