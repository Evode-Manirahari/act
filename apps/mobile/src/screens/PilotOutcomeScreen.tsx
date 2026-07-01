import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import ActAskPanel from '../components/ActAskPanel';
import ActBottomBar from '../components/ActBottomBar';
import { logJobEvent, upsertJobOutcome } from '../api/captureApi';
import type { JobOutcomeOut } from '../api/captureApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import {
  ActButton,
  ActCard,
  ActInput,
  ActScreen,
  ActText,
  colors,
  radii,
  spacing,
} from '../design';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;
type OutcomeRoute = RouteProp<PilotStackParamList, 'PilotOutcome'>;
type FirstFixState = 'yes' | 'no';
type ProgressState = 'not_observed' | 'reviewed_card' | 'passed_quiz' | 'applied_in_field';

const diagnosisChoices = ['15', '30', '45', '60'];

const progressLabels: Record<ProgressState, string> = {
  not_observed: 'Not observed',
  reviewed_card: 'Reviewed card',
  passed_quiz: 'Passed quiz',
  applied_in_field: 'Applied in field',
};

export default function PilotOutcomeScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<OutcomeRoute>();
  const [diagnosis, setDiagnosis] = useState('');
  const [fix, setFix] = useState('');
  const [firstFix, setFirstFix] = useState<FirstFixState>('yes');
  const [diagnosisMinutes, setDiagnosisMinutes] = useState('');
  const [progress, setProgress] = useState<ProgressState>('not_observed');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOutcome, setSavedOutcome] = useState<JobOutcomeOut | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const jobId = route.params?.jobId;
  const recordedBy = route.params?.recordedBy;
  const callback = firstFix === 'no';

  const managerNotes = useMemo(
    () => buildManagerNotes({ diagnosisMinutes, progress, notes }),
    [diagnosisMinutes, progress, notes],
  );

  async function saveOutcome() {
    if (!jobId) return;
    setSaving(true);
    setError(null);
    try {
      const outcome = await upsertJobOutcome({
        jobId,
        finalDiagnosis: diagnosis.trim() || null,
        fix: fix.trim() || null,
        callback,
        callbackAt: callback ? new Date().toISOString() : null,
        managerNotes,
        recordedBy,
      });
      setSavedOutcome(outcome);
      void logJobEvent({
        eventType: 'outcome_logged',
        actorId: recordedBy ?? null,
        jobId,
        payload: { callback: outcome.callback, diagnosis_minutes: diagnosisMinutes || null, progress },
      }).catch(() => {
        // Outcome save already succeeded; event logging is additive.
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outcome save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActAppShell
      mode="Outcome"
      rightLabel="Training"
      rightMuted
      onRightPress={() => navigation.navigate('Learn', undefined)}
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
      bottomBar={<ActBottomBar onPress={() => setAskOpen(true)} />}
    >
      <ActAskPanel visible={askOpen} onClose={() => setAskOpen(false)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ActScreen>
          <ActCard>
            <ActText variant="label" color="primary">
              Measurement loop
            </ActText>
            <ActText variant="h1" style={styles.summaryTitle}>
              Did this training transfer?
            </ActText>
            <ActText variant="small" color="textMuted">
              Log the repair outcome, callback signal, diagnosis speed, and apprentice progress for
              this field job.
            </ActText>
          </ActCard>

          {!jobId ? (
            <ActCard tone="err" accent="err">
              <ActText variant="label" color="error">
                No field job selected
              </ActText>
              <ActText variant="small" color="steel700" style={styles.gapTop}>
                Open outcome logging from a reviewed recording so this attaches to real capture data.
              </ActText>
            </ActCard>
          ) : null}

          <View style={styles.metricsRow}>
            <Metric label="job" value={jobId ? jobId.slice(0, 8) : 'none'} />
            <Metric label="callback" value={callback ? 'yes' : 'no'} tone={callback ? 'warn' : 'good'} />
            <Metric label="diagnosis" value={`${diagnosisMinutes || '0'} min`} />
          </View>

          <ActCard style={styles.form}>
            <ActInput
              label="Final diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="e.g. failed run capacitor"
            />
            <ActInput
              label="Fix"
              value={fix}
              onChangeText={setFix}
              placeholder="e.g. replaced capacitor, verified pressures"
              multiline
            />

            <View style={styles.fieldGroup}>
              <ActText variant="label" color="textMuted">
                First-time fix
              </ActText>
              <View style={styles.segmentRow}>
                <Segment label="Yes" selected={firstFix === 'yes'} onPress={() => setFirstFix('yes')} />
                <Segment label="Callback" selected={firstFix === 'no'} onPress={() => setFirstFix('no')} />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ActText variant="label" color="textMuted">
                Diagnosis time
              </ActText>
              <View style={styles.segmentRow}>
                {diagnosisChoices.map((choice) => (
                  <Segment
                    key={choice}
                    label={`${choice}m`}
                    selected={diagnosisMinutes === choice}
                    onPress={() => setDiagnosisMinutes(choice)}
                  />
                ))}
              </View>
              <TextInput
                style={styles.inlineInput}
                value={diagnosisMinutes}
                onChangeText={(v) => setDiagnosisMinutes(v.replace(/[^0-9]/g, '').slice(0, 3))}
                placeholder="Minutes"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ActText variant="label" color="textMuted">
                Apprentice progress
              </ActText>
              <View style={styles.segmentRow}>
                {(Object.keys(progressLabels) as ProgressState[]).map((key) => (
                  <Segment
                    key={key}
                    label={progressLabels[key]}
                    selected={progress === key}
                    onPress={() => setProgress(key)}
                  />
                ))}
              </View>
            </View>

            <ActInput
              label="Manager note"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything that will matter in the next review"
              multiline
            />
          </ActCard>

          {error ? (
            <ActCard tone="err" accent="err">
              <ActText variant="small" color="error" weight="semibold">
                {error}
              </ActText>
            </ActCard>
          ) : null}

          {savedOutcome ? (
            <ActCard tone="ok" accent="ok">
              <ActText variant="label" style={styles.okTitle}>
                Outcome saved
              </ActText>
              <ActText variant="small" color="steel700" style={styles.gapTop}>
                {savedOutcome.callback
                  ? 'Callback risk is now visible in the manager loop.'
                  : 'First-time fix is recorded for this job.'}
              </ActText>
            </ActCard>
          ) : null}

          <ActButton
            label={savedOutcome ? 'Outcome saved' : 'Save outcome'}
            onPress={() => void saveOutcome()}
            disabled={!jobId}
            loading={saving}
          />
        </ActScreen>
      </KeyboardAvoidingView>
    </ActAppShell>
  );
}

function Segment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.segment, selected && styles.segmentSel, pressed && styles.pressed]}
      onPress={onPress}
    >
      <ActText
        variant="small"
        weight="semibold"
        color={selected ? 'primary' : 'textMuted'}
        style={styles.segmentText}
      >
        {label}
      </ActText>
    </Pressable>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <ActCard style={styles.metric}>
      <ActText variant="label" color="textMuted" style={styles.metricLabel}>
        {label}
      </ActText>
      <ActText
        variant="h2"
        mono
        color={tone === 'good' ? 'success' : tone === 'warn' ? 'error' : 'ink'}
        style={styles.metricValue}
      >
        {value}
      </ActText>
    </ActCard>
  );
}

function buildManagerNotes({
  diagnosisMinutes,
  progress,
  notes,
}: {
  diagnosisMinutes: string;
  progress: ProgressState;
  notes: string;
}) {
  const minutes = Number.parseInt(diagnosisMinutes, 10);
  return [
    Number.isFinite(minutes) ? `Diagnosis time: ${minutes} minutes.` : null,
    `Apprentice progress: ${progressLabels[progress]}.`,
    notes.trim() ? `Manager note: ${notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryTitle: { marginTop: 2 },
  gapTop: { marginTop: 3 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  metric: { flex: 1, minHeight: 72, justifyContent: 'center' },
  metricLabel: { fontSize: 9.5 },
  metricValue: { marginTop: 6 },
  form: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  segment: {
    minHeight: 42,
    minWidth: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSel: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  segmentText: { textAlign: 'center' },
  inlineInput: {
    width: 112,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  okTitle: { color: '#0E6B30' },
  pressed: { opacity: 0.76 },
});
