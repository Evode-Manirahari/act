/**
 * ReviewDebriefPanel — the post-job debrief loop for an approved moment.
 *
 * IMPORTANT product rule: this panel only ever runs AFTER the job. Nothing here
 * is a real-time instruction to the tech. The reviewer (a lead tech) walks the
 * moment through:
 *
 *   1. Load the question   -> loadOrCreateMomentQuestion(momentId)
 *   2. Review/edit the question text
 *   3. Expert answer       -> submitExpertAnswer / submitExpertAudioAnswer
 *   4. Compile draft       -> compileMoment({ momentId })
 *   5. Publish after review -> publishKnowledgeObject(knowledgeObjectId)
 *
 * Steps 4 and 5 are gated on `reviewDebriefModel`, which only advances past
 * step 3 when act-api has actually stored an answer. There is no path in this
 * panel that fills the answer box for the technician: an unanswered moment
 * renders as "waiting for debrief" for as long as that remains true.
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
import { fonts, labelStyle, labelSmallStyle } from '../theme/typography';
import { radii } from '../design/tokens';
import type {
  ElicitationQuestion,
  KnowledgeObject,
} from '../api/libraryApi';
import {
  actionLabel,
  canCompile,
  canEditQuestion,
  canPublish,
  canRequestQuestion,
  canSubmitAudioAnswer,
  canSubmitTypedAnswer,
  isBusy,
  isUnconfirmed,
  phaseAtLeast,
  phaseHint,
  type DebriefState,
} from '../screens/reviewDebriefModel';

export type ReviewDebriefPanelProps = {
  /** Mono id label for the moment under debrief. */
  momentId: string;
  /** The phase machine for this moment — owns every gate below. */
  state: DebriefState;
  /** Server question once one has been loaded or drafted (null before that). */
  question: ElicitationQuestion | null;
  /** Compiled draft card once step 4 runs (null before that). */
  draft: KnowledgeObject | null;
  /** Lift the technician's typed answer so it survives a session expiry. */
  onDraftAnswerChange: (text: string) => void;
  /** Explicit retry after a failed hydration. Nothing retries automatically. */
  onRetrySync: () => void;
  /** Step 1: load this moment's question, drafting one only if none exists. */
  onLoadQuestion: () => void;
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
  state,
  question,
  draft,
  onDraftAnswerChange,
  onRetrySync,
  onLoadQuestion,
  onSubmitAnswer,
  onSubmitAudioAnswer,
  onCompileDraft,
  onPublish,
  onOpenCard,
}: ReviewDebriefPanelProps) {
  // We keep the edited prompt locally until save; the screen persists any edits
  // before submitting the expert answer.
  const [questionText, setQuestionText] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<Audio.Recording | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Sync the editable buffer the first time a server question arrives or when
  // it changes id (regenerate). Local edits after that are preserved.
  const effectiveQuestion =
    questionText ?? question?.question ?? '';

  // The answer text lives in the machine so a session expiry mid-submit doesn't
  // discard what the technician wrote.
  const answerText = state.draftAnswer;
  const busy = isBusy(state);
  const published = state.phase === 'published';
  const answerReady = phaseAtLeast(state.phase, 'answered');
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
      // The transcript is the technician's own recorded words coming back from
      // the server, not text the app composed.
      await onSubmitAudioAnswer(effectiveQuestion, uri);
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

      {/* Session / rejection banners — the honest reason the loop is stuck. */}
      {state.block.kind === 'auth' ? (
        <View style={styles.blockBand}>
          <Text style={styles.blockBandTitle}>Signed out</Text>
          <Text style={styles.blockBandBody}>{state.block.message}</Text>
          <Text style={styles.blockBandBody}>
            Your answer is still here. Sign in again and submit it.
          </Text>
        </View>
      ) : null}
      {state.block.kind === 'rejected' ? (
        <View style={styles.blockBand}>
          <Text style={styles.blockBandTitle}>Answer not saved</Text>
          <Text style={styles.blockBandBody}>{state.block.message}</Text>
        </View>
      ) : null}

      {/* Unconfirmed server state. Nothing retries on its own — an automatic
          loop against an unhealthy backend is worse than waiting for a human. */}
      {isUnconfirmed(state) && state.block.kind !== 'auth' ? (
        <View style={styles.blockBand}>
          <Text style={styles.blockBandTitle}>Could not confirm server state</Text>
          <Text style={styles.blockBandBody}>{phaseHint(state)}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onRetrySync}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Step 1 — load (or draft) the question */}
      <StepHeader index={1} label="Debrief question" done={!!question} />
      {!question ? (
        <Pressable
          accessibilityRole="button"
          disabled={!canRequestQuestion(state)}
          onPress={onLoadQuestion}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            !canRequestQuestion(state) && styles.disabled,
          ]}
        >
          {state.action === 'questioning' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {actionLabel(state, 'questioning', 'Load debrief question')}
            </Text>
          )}
        </Pressable>
      ) : null}

      {question ? (
        <>
          {/* Step 2 — review / edit the question (local text state only) */}
          <StepHeader index={2} label="Review the question" done={answerReady} />
          {question.reason ? (
            <Text style={styles.questionReason}>Why ACT asked: {question.reason}</Text>
          ) : null}
          <TextInput
            style={styles.questionInput}
            value={effectiveQuestion}
            onChangeText={setQuestionText}
            multiline
            editable={canEditQuestion(state)}
            placeholder="Edit the debrief question"
            placeholderTextColor={colors.textLight}
          />

          {/* Step 3 — expert answer text */}
          <StepHeader index={3} label="Expert's answer" done={answerReady} />
          <TextInput
            style={styles.answerInput}
            value={answerText}
            onChangeText={onDraftAnswerChange}
            multiline
            editable={!busy && !published}
            placeholder="In the expert's own words: what told them to act here, and what would a newer tech get wrong?"
            placeholderTextColor={colors.textLight}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmitTypedAnswer(state)}
            onPress={() => onSubmitAnswer(effectiveQuestion, answerText.trim())}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              !canSubmitTypedAnswer(state) && styles.disabled,
            ]}
          >
            {state.action === 'answering' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {actionLabel(state, 'answering', 'Save expert answer')}
              </Text>
            )}
          </Pressable>
          {onSubmitAudioAnswer ? (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={
                  voiceRecording ? voiceBusy : !canSubmitAudioAnswer(state) || voiceDisabled
                }
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
      ) : null}

      {/* Step 4 — compile draft. Only reachable once the server stored an answer. */}
      {question && !answerReady ? (
        <Text style={styles.compileHint}>
          This moment is waiting for the expert's answer. Nothing compiles or
          publishes until they've answered in their own words.
        </Text>
      ) : null}
      {answerReady ? (
        <>
          <StepHeader index={4} label="Compile draft card" done={!!draft} />
          {!draft ? (
            <Pressable
              accessibilityRole="button"
              disabled={!canCompile(state)}
              onPress={onCompileDraft}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                !canCompile(state) && styles.disabled,
              ]}
            >
              {state.action === 'compiling' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {actionLabel(state, 'compiling', 'Compile draft from answer')}
                </Text>
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
              disabled={!canPublish(state)}
              onPress={onPublish}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                !canPublish(state) && styles.disabled,
              ]}
            >
              {state.action === 'publishing' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {actionLabel(state, 'publishing', 'Publish to apprentice library')}
                </Text>
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
    borderRadius: radii.sm, // squared instrument chip, matches ActPill
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  donePillText: {
    ...labelSmallStyle,
    color: colors.successInk,
    
  },
  lede: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  blockBand: {
    borderRadius: 8,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    padding: 12,
    gap: 4,
  },
  blockBandTitle: {
    color: colors.error,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  blockBandBody: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  voiceCompleteBand: {
    borderRadius: 8,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    padding: 12,
    gap: 4,
  },
  voiceCompleteTitle: {
    color: colors.successInk,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  voiceCompleteBody: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  compileHint: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
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
    color: colors.onSolid,
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
    color: colors.onSolid,
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
    ...labelSmallStyle,
    color: colors.steel500,
    
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
    fontSize: labelSmallStyle.fontSize,
    letterSpacing: 0.5,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
