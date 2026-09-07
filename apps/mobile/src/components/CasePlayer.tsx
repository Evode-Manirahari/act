/**
 * Decision-first case player. The apprentice commits a hypothesis and next
 * test before any expert field is shown. Scoring "correct" is not a stage.
 */
import React, { useMemo, useReducer, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { KnowledgeObject } from '../api/libraryApi';
import { logTrainingEvent } from '../api/libraryApi';
import {
  ActButton,
  ActCard,
  ActEmptyState,
  ActInput,
  ActPill,
  ActText,
  colors,
  labelSmallStyle,
  spacing,
} from '../design';
import {
  CHALLENGE_PROMPT,
  COMPARISON_LABEL,
  EPISODE_LABEL,
  VARIANT_PROMPT,
  canPractice,
  commitEventNote,
  commitReady,
  compareCommitToExpert,
  diagnosticCaseFromKnowledgeObject,
  expertHidden,
  filled,
  initialPlayerState,
  learnerPrompt,
  reducePlayer,
  variantEventNote,
  type LearnerCommit,
  type PlayerEvent,
  type PlayerState,
} from '@act/domain';

type Props = {
  card: KnowledgeObject;
  userId: string | undefined;
  /** Delayed variant: title hidden until the reveal; the completion is logged as transfer evidence. */
  variant?: boolean;
  onBack: () => void;
};

export default function CasePlayer({ card, userId, variant = false, onBack }: Props) {
  const diag = useMemo(() => diagnosticCaseFromKnowledgeObject(card), [card]);
  const [state, dispatch] = useReducer(
    reducePlayer,
    { hasSafety: Boolean(diag.safetyBoundary?.trim()) },
    initialPlayerState,
  );
  const [saving, setSaving] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [savedComplete, setSavedComplete] = useState(false);

  const hideExpert = expertHidden(state.stage);
  const note = () =>
    variant
      ? variantEventNote(state.commit, state.disconfirm, state.reflection)
      : commitEventNote(state.commit, state.disconfirm, state.reflection);
  const comparisons = useMemo(
    () => compareCommitToExpert(diag, state.commit),
    [diag, state.commit],
  );

  if (!canPractice(diag)) {
    return (
      <View style={styles.container}>
        <BackRow onBack={onBack} />
        <View style={styles.bodyPad}>
          <ActEmptyState
            title="Not enough case to practice"
            body="This published card is missing a situation and a decision trace. Send it back to review rather than revealing an answer."
          />
        </View>
      </View>
    );
  }

  async function persistCommit() {
    if (!userId) {
      setTrackingError('Apprentice identity is required before logging a decision.');
      return false;
    }
    setSaving(true);
    setTrackingError(null);
    try {
      await logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: 'quiz_attempted',
        note: note(),
      });
      return true;
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'could not save your decision');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function persistComplete() {
    if (!userId) {
      setTrackingError('Apprentice identity is required before logging progress.');
      return;
    }
    setSaving(true);
    setTrackingError(null);
    try {
      await logTrainingEvent({
        knowledgeObjectId: card.id,
        userId,
        eventType: 'completed',
        note: note(),
      });
      setSavedComplete(true);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'completion save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitCommit() {
    const ok = await persistCommit();
    if (ok) dispatch({ type: 'submit_commit' });
  }

  async function onSubmitReflect() {
    dispatch({ type: 'submit_reflect' });
    await persistComplete();
  }

  return (
    <View style={styles.container}>
      <BackRow onBack={onBack} />
      <FlatList
        data={[state.stage]}
        keyExtractor={(stage) => stage}
        contentContainerStyle={styles.detailBody}
        renderItem={() => (
          <>
            <ActText variant="label" color="primary">
              {variant ? 'Delayed variant · ' : ''}
              {EPISODE_LABEL[diag.episodeType]} · commit first
            </ActText>
            <ActText variant="display" style={styles.detailTitle}>
              {variant && hideExpert ? 'Same principle, different call' : diag.title}
            </ActText>
            {variant && hideExpert ? (
              <ActText variant="small" color="textMuted">
                {VARIANT_PROMPT}
              </ActText>
            ) : null}
            <View style={styles.meta}>
              <ActPill label={diag.trade} tone="orange" />
              {diag.status === 'published' ? <ActPill label="company-approved" tone="ok" /> : null}
            </View>

            {diag.safetyBoundary && (state.stage === 'safety' || !hideExpert) ? (
              <ActCard tone="err" accent="err">
                <View style={styles.sectionHd}>
                  <View style={styles.lockoutIcon}>
                    <ActText variant="label" mono style={styles.lockoutIconText}>
                      !
                    </ActText>
                  </View>
                  <ActText variant="label" color="error">
                    Safety — stop conditions first
                  </ActText>
                </View>
                <ActText variant="body" color="error" weight="medium" style={styles.errBody}>
                  {diag.safetyBoundary}
                </ActText>
                {state.stage === 'safety' ? (
                  <ActButton
                    label="I understand — continue"
                    variant="danger"
                    onPress={() => dispatch({ type: 'acknowledge_safety' })}
                  />
                ) : null}
              </ActCard>
            ) : null}

            {state.stage !== 'safety' ? (
              <>
                <Section label="The call" body={diag.presentingProblem} />
                <EquipmentBand diag={diag} />
              </>
            ) : null}

            {state.stage === 'commit' ? (
              <ActCard accent="orange">
                <ActText variant="label" color="primary">
                  Your call
                </ActText>
                <ActText variant="small" color="textMuted">
                  {learnerPrompt(diag)}
                </ActText>
                <CommitField
                  state={state}
                  dispatch={dispatch}
                  field="cue"
                  label="Most important cue"
                  placeholder="What would you notice first?"
                />
                <CommitField
                  state={state}
                  dispatch={dispatch}
                  field="hypothesis"
                  label="Working hypothesis"
                  placeholder="What do you think is going on?"
                />
                <CommitField
                  state={state}
                  dispatch={dispatch}
                  field="nextTest"
                  label="Next test"
                  placeholder="Which check would you run, and what would it tell you?"
                />
                <CommitField
                  state={state}
                  dispatch={dispatch}
                  field="rationale"
                  label="Why that test"
                  placeholder="Why this, not the obvious next swap?"
                />
                <ActButton
                  label={saving ? 'Saving your decision' : 'Commit decision'}
                  onPress={() => void onSubmitCommit()}
                  disabled={!commitReady(state.commit) || !userId || saving}
                  loading={saving}
                />
              </ActCard>
            ) : null}

            {state.stage === 'challenge' ? (
              <ActCard accent="orange">
                <ActText variant="label" color="primary">
                  Challenge
                </ActText>
                <ActText variant="bodyStrong" weight="semibold">
                  {CHALLENGE_PROMPT}
                </ActText>
                <ActInput
                  multiline
                  value={state.disconfirm}
                  onChangeText={(value) => dispatch({ type: 'set_disconfirm', value })}
                  placeholder="Name a reading, sight, or sound that would kill this hypothesis."
                />
                <ActButton
                  label="Show expert comparison"
                  onPress={() => dispatch({ type: 'submit_challenge' })}
                  disabled={!filled(state.disconfirm)}
                />
              </ActCard>
            ) : null}

            {state.stage === 'reveal' || state.stage === 'reflect' || state.stage === 'complete' ? (
              <>
                <ActText variant="label" color="textMuted">
                  Expert comparison — not a score
                </ActText>
                {comparisons.map((line) => (
                  <ActCard
                    key={line.dimension}
                    tone={line.dimension === 'safety' ? 'err' : line.dimension === 'trap' ? 'warn' : 'surface'}
                    accent={
                      line.dimension === 'safety' ? 'err' : line.dimension === 'trap' ? 'warn' : 'steel'
                    }
                  >
                    <ActText
                      variant="label"
                      color={
                        line.dimension === 'safety'
                          ? 'error'
                          : line.dimension === 'trap'
                            ? 'caution'
                            : 'textMuted'
                      }
                    >
                      {COMPARISON_LABEL[line.dimension]}
                    </ActText>
                    <ActText variant="body" color="steel700">
                      {line.expert}
                    </ActText>
                    {line.learner ? (
                      <ActText variant="small" color="textMuted">
                        You said: {line.learner}
                      </ActText>
                    ) : null}
                  </ActCard>
                ))}
                <Section label="Verification" body={diag.verification} />
                {state.stage === 'reveal' ? (
                  <ActButton
                    label="What transfers?"
                    onPress={() => dispatch({ type: 'continue_reveal' })}
                  />
                ) : null}
              </>
            ) : null}

            {state.stage === 'reflect' ? (
              <ActCard accent="orange">
                <ActText variant="label" color="primary">
                  What transfers
                </ActText>
                <ActText variant="small" color="textMuted">
                  One sentence you would use on a different unit next week.
                </ActText>
                <ActInput
                  multiline
                  value={state.reflection}
                  onChangeText={(value) => dispatch({ type: 'set_reflection', value })}
                  placeholder="The principle, not the part number."
                />
                <ActButton
                  label={saving ? 'Saving' : 'Save and finish'}
                  onPress={() => void onSubmitReflect()}
                  disabled={!filled(state.reflection) || !userId || saving}
                  loading={saving}
                />
              </ActCard>
            ) : null}

            {state.stage === 'complete' ? (
              <ActCard tone="ok" accent="ok">
                <ActText variant="label" color="success">
                  {variant ? 'Variant recorded' : 'Practice recorded'}
                </ActText>
                <ActText variant="small" color="textMuted">
                  {savedComplete
                    ? 'Your hypothesis, test, and transfer note are logged. This is not a skill score.'
                    : 'Decision saved locally. Retry if the completion event did not land.'}
                </ActText>
                {!savedComplete ? (
                  <ActButton
                    label="Retry save"
                    variant="secondary"
                    onPress={() => void persistComplete()}
                    loading={saving}
                  />
                ) : null}
              </ActCard>
            ) : null}

            {trackingError ? (
              <ActText variant="small" color="error" weight="semibold">
                {trackingError}
              </ActText>
            ) : null}
          </>
        )}
      />
    </View>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.detailHeader}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
        <ActText variant="bodyStrong" weight="semibold" color="primary">
          ‹ Cases
        </ActText>
      </Pressable>
    </View>
  );
}

function CommitField({
  state,
  dispatch,
  field,
  label,
  placeholder,
}: {
  state: PlayerState;
  dispatch: (event: PlayerEvent) => void;
  field: keyof LearnerCommit;
  label: string;
  placeholder: string;
}) {
  return (
    <ActInput
      label={label}
      multiline
      value={state.commit[field]}
      onChangeText={(value) => dispatch({ type: 'set_commit', field, value })}
      placeholder={placeholder}
    />
  );
}

function EquipmentBand({
  diag,
}: {
  diag: ReturnType<typeof diagnosticCaseFromKnowledgeObject>;
}) {
  const equipment = [diag.equipment.systemType, diag.equipment.make, diag.equipment.model]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ');
  const rows = [
    diag.equipment.jurisdiction ? { label: 'Jurisdiction', value: diag.equipment.jurisdiction } : null,
    diag.equipment.siteLabel ? { label: 'Site', value: diag.equipment.siteLabel } : null,
    equipment ? { label: 'Equipment', value: equipment } : null,
  ].filter((row): row is { label: string; value: string } => row != null);
  if (rows.length === 0) return null;
  return (
    <ActCard style={styles.trustBand}>
      {rows.map((row) => (
        <View key={row.label} style={styles.trustRow}>
          <ActText variant="label" color="textMuted" style={styles.trustLabel}>
            {row.label}
          </ActText>
          <ActText variant="small" weight="medium" style={styles.trustValue}>
            {row.value}
          </ActText>
        </View>
      ))}
    </ActCard>
  );
}

function Section({ label, body }: { label: string; body: string | null }) {
  if (!body) return null;
  return (
    <ActCard accent="steel">
      <ActText variant="label" color="textMuted">
        {label}
      </ActText>
      <ActText variant="body" color="steel700">
        {body}
      </ActText>
    </ActCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bodyPad: { padding: spacing.lg },
  detailHeader: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailBody: { padding: spacing.lg, gap: spacing.md },
  detailTitle: { fontSize: 22, lineHeight: 28 },
  meta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  trustBand: { backgroundColor: colors.surfaceAlt, gap: spacing.sm },
  trustRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  trustLabel: { width: 92, fontSize: labelSmallStyle.fontSize },
  trustValue: { flex: 1 },
  sectionHd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lockoutIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockoutIconText: { color: colors.onSolid, fontSize: 12, letterSpacing: 0 },
  errBody: { color: colors.errorInk },
});
