/**
 * ReviewDebriefPanel — the post-job debrief loop for an approved moment.
 *
 * IMPORTANT product rule: this panel only ever runs AFTER the job. Nothing here
 * is a real-time instruction to the tech. The reviewer (a lead tech) walks the
 * moment through:
 *
 *   1. Generate question  -> generateMomentQuestion(momentId)
 *   2. Review/edit the question text (local state; no edit endpoint required)
 *   3. Expert answer text -> submitExpertAnswer({ questionId, transcript })
 *   4. Compile draft       -> compileMoment({ momentId })
 *   5. Publish after review -> publishKnowledgeObject(knowledgeObjectId)
 *
 * Every API client call goes through the screen's handlers so error states stay
 * visible and centralized; this component only owns local UI/text state.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Audio } from 'expo-av';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';
import type {
  ElicitationQuestion,
  KnowledgeObject,
} from '../api/libraryApi';

export type DebriefStep =
  | 'idle'
  | 'questioning'
  | 'answering'
  | 'drafting'
  | 'publishing';

export type ReviewDebriefPanelProps = {
  /** Mono id label for the moment under debrief. */
  momentId: string;
  /** Server-generated question once step 1 runs (null before that). */
  question: ElicitationQuestion | null;
  /** Compiled draft card once step 4 runs (null before that). */
  draft: KnowledgeObject | null;
  /** Whichever async step is currently in flight for this moment. */
  busyStep: DebriefStep;
  /** True once the draft's knowledge object is published. */
  published: boolean;
  /** Step 1: ask the server for a debrief question. */
  onGenerateQuestion: () => void;
  /** Step 3: submit the expert's answer text for the current question. */
  onSubmitAnswer: (questionText: string, answerText: string) => void;
  /** Optional Step 3 voice path: submit recorded expert audio, then use transcript. */
  onSubmitAudioAnswer?: (questionText: string, audioUri: string) => Promise<string | null>;
  /** Step 4: compile the answered moment into a draft card. */
  onCompileDraft: () => void;
  /** Step 5: publish the compiled draft. */
  onPublish: () => void;
  /** Open the published / draft card in the Learn surface. */
  onOpenCard: (card: KnowledgeObject) => void;
};

export default function ReviewDebriefPanel({
  momentId,
  question,
  draft,
  busyStep,
  published,
  onGenerateQuestion,
  onSubmitAnswer,
  onSubmitAudioAnswer,
  onCompileDraft,
  onPublish,
  onOpenCard,
}: ReviewDebriefPanelProps) {
  // Question text is editable locally — there is no edit endpoint, and the
  // expert answer is what actually flows to compile. We keep the edited
  // prompt so the reviewer can sharpen ACT's question before answering.
  const [questionText, setQuestionText] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [voiceRecording, setVoiceRecording] = useState<Audio.Recording | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Sync the editable buffer the first time a server question arrives or when
  // it changes id (regenerate). Local edits after that are preserved.
  const effectiveQuestion =
    questionText ?? question?.question ?? '';

  const busy = busyStep !== 'idle';
  const voiceDisabled = busy || published || !question || !onSubmitAudioAnswer || voiceBusy;

  useEffect(() => {
    return () => {
      if (voiceRecording) {
        void voiceRecording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [voiceRecording]);

  async function startVoiceAnswer() {
    if (voiceDisabled || voiceRecording) return;
    setVoiceError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceError('Microphone permission is required for voice answers.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setVoiceRecording(rec);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not start voice answer.');
    }
  }

  async function stopAndSubmitVoiceAnswer() {
    if (!voiceRecording || !onSubmitAudioAnswer) return;
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      await voiceRecording.stopAndUnloadAsync();
      const uri = voiceRecording.getURI();
      setVoiceRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) {
        throw new Error('Voice answer did not save.');
      }
      const transcript = await onSubmitAudioAnswer(effectiveQuestion, uri);
      if (transcript) {
        setAnswerText(transcript);
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not save voice answer.');
    } finally {
      setVoiceBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Debrief · after the job</Text>
        {published ? (
          <View style={styles.donePill}>
            <Text style={styles.donePillText}>Published</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.lede}>
        Ask the expert what a newer tech would miss here. This runs after the
        call — never in their ear on the job.
      </Text>

      {/* Step 1 — generate the question */}
      <StepHeader index={1} label="Generate question" done={!!question} />
      {!question ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onGenerateQuestion}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
        >
          {busyStep === 'questioning' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Generate debrief question</Text>
          )}
        </Pressable>
      ) : (
        <>
          {/* Step 2 — review / edit the question (local text state only) */}
          <StepHeader index={2} label="Review the question" done={answerText.trim().length > 0} />
          {question.reason ? (
            <Text style={styles.questionReason}>Why ACT asked: {question.reason}</Text>
          ) : null}
          <TextInput
            style={styles.questionInput}
            value={effectiveQuestion}
            onChangeText={setQuestionText}
            multiline
            editable={!busy && !published}
            placeholder="Edit the debrief question"
            placeholderTextColor={colors.textLight}
          />

          {/* Step 3 — expert answer text */}
          <StepHeader index={3} label="Expert's answer" done={!!draft} />
          <TextInput
            style={styles.answerInput}
            value={answerText}
            onChangeText={setAnswerText}
            multiline
            editable={!busy && !published}
            placeholder="In the expert's own words: what told them to act here, and what would a newer tech get wrong?"
            placeholderTextColor={colors.textLight}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy || published || answerText.trim().length === 0}
            onPress={() => onSubmitAnswer(effectiveQuestion, answerText.trim())}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              (busy || published || answerText.trim().length === 0) && styles.disabled,
            ]}
          >
            {busyStep === 'answering' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Save expert answer</Text>
            )}
          </Pressable>
          {onSubmitAudioAnswer ? (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={voiceDisabled && !voiceRecording}
                onPress={() =>
                  voiceRecording
                    ? void stopAndSubmitVoiceAnswer()
                    : void startVoiceAnswer()
                }
                style={({ pressed }) => [
                  styles.voiceButton,
                  voiceRecording && styles.voiceButtonRecording,
                  pressed && styles.pressed,
                  (voiceDisabled && !voiceRecording) && styles.disabled,
                ]}
              >
                {voiceBusy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      styles.voiceButtonText,
                      voiceRecording && styles.voiceButtonRecordingText,
                    ]}
                  >
                    {voiceRecording ? 'Stop and save voice answer' : 'Record voice answer'}
                  </Text>
                )}
              </Pressable>
              {voiceError ? (
                <Text style={styles.voiceError}>{voiceError}</Text>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {/* Step 4 — compile draft */}
      {question ? (
        <>
          <StepHeader index={4} label="Compile draft card" done={!!draft} />
          {!draft ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy || published}
              onPress={onCompileDraft}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                (busy || published) && styles.disabled,
              ]}
            >
              {busyStep === 'drafting' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Compile draft from answer</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenCard(draft)}
              style={({ pressed }) => [styles.draftBand, pressed && styles.pressed]}
            >
              <Text style={styles.draftBandLabel}>
                {published ? 'Published card' : 'Draft card · review before publish'}
              </Text>
              <Text style={styles.draftBandTitle}>{draft.title}</Text>
              {draft.safety_boundary ? (
                <Text style={styles.draftBandSafety}>
                  Safety: {draft.safety_boundary}
                </Text>
              ) : null}
            </Pressable>
          )}
        </>
      ) : null}

      {/* Step 5 — publish after review */}
      {draft ? (
        <>
          <StepHeader index={5} label="Publish after review" done={published} />
          {!published ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onPublish}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              {busyStep === 'publishing' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Publish to apprentice library</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenCard(draft)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Open published card</Text>
            </Pressable>
          )}
        </>
      ) : null}

      <Text style={styles.momentIdLabel}>Moment {momentId.slice(0, 8)}</Text>
    </View>
  );
}

function StepHeader({
  index,
  label,
  done,
}: {
  index: number;
  label: string;
  done: boolean;
}) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        <Text style={[styles.stepDotText, done && styles.stepDotTextDone]}>
          {done ? '✓' : index}
        </Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    ...labelStyle,
    color: colors.steel700,
    fontSize: 11,
  },
  donePill: {
    borderRadius: 999,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  donePillText: {
    ...labelStyle,
    color: '#065F46',
    fontSize: 10,
  },
  lede: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 2,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepDotText: {
    fontFamily: fonts.monoSemibold,
    fontSize: 11,
    color: colors.steel700,
  },
  stepDotTextDone: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  questionReason: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  questionInput: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  answerInput: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  voiceButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  voiceButtonRecording: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  voiceButtonText: {
    color: colors.steel700,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  voiceButtonRecordingText: {
    color: colors.error,
  },
  voiceError: {
    color: colors.error,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  draftBand: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  draftBandLabel: {
    ...labelStyle,
    color: colors.steel500,
    fontSize: 10,
  },
  draftBandTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  draftBandSafety: {
    color: colors.error,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  momentIdLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
