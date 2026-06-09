import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createDemoSession } from '../api/captureApi';
import type { DemoSession } from '../api/captureApi';
import { upsertJobOutcome } from '../api/captureApi';
import type { JobOutcomeOut } from '../api/captureApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { colors } from '../theme/colors';

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
  const [session, setSession] = useState<DemoSession | null>(null);
  const [diagnosis, setDiagnosis] = useState('Capacitor failure');
  const [fix, setFix] = useState('Replaced run capacitor and verified operation');
  const [firstFix, setFirstFix] = useState<FirstFixState>('yes');
  const [diagnosisMinutes, setDiagnosisMinutes] = useState('30');
  const [progress, setProgress] = useState<ProgressState>('reviewed_card');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOutcome, setSavedOutcome] = useState<JobOutcomeOut | null>(null);

  const jobId = route.params?.jobId ?? session?.job_id;
  const recordedBy = route.params?.recordedBy ?? session?.user_id;
  const callback = firstFix === 'no';

  useEffect(() => {
    if (route.params?.jobId) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await createDemoSession();
        if (!cancelled) setSession(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not create demo job.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params?.jobId]);

  const managerNotes = useMemo(
    () =>
      buildManagerNotes({
        diagnosisMinutes,
        progress,
        notes,
      }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Outcome save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('PilotHome')
            }
            hitSlop={12}
          >
            <Text style={styles.headerBack}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Job Outcome</Text>
          <Pressable onPress={() => navigation.navigate('Learn', undefined)} hitSlop={12}>
            <Text style={styles.headerAction}>Training</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Measurement loop</Text>
            <Text style={styles.summaryTitle}>Did this training transfer?</Text>
            <Text style={styles.summaryText}>
              Log the repair outcome, callback signal, diagnosis speed, and apprentice progress for this field job.
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <Metric label="job" value={jobId ? jobId.slice(0, 8) : 'loading'} />
            <Metric label="callback" value={callback ? 'yes' : 'no'} tone={callback ? 'warn' : 'good'} />
            <Metric label="diagnosis" value={`${diagnosisMinutes || '0'} min`} />
          </View>

          <View style={styles.formCard}>
            <Field
              label="Final diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="e.g. failed run capacitor"
            />
            <Field
              label="Fix"
              value={fix}
              onChangeText={setFix}
              placeholder="e.g. replaced capacitor, verified pressures"
              multiline
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>First-time fix</Text>
              <View style={styles.segmentRow}>
                <SegmentButton
                  label="Yes"
                  selected={firstFix === 'yes'}
                  onPress={() => setFirstFix('yes')}
                />
                <SegmentButton
                  label="Callback"
                  selected={firstFix === 'no'}
                  onPress={() => setFirstFix('no')}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Diagnosis time</Text>
              <View style={styles.segmentRow}>
                {diagnosisChoices.map((choice) => (
                  <SegmentButton
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
                onChangeText={(value) =>
                  setDiagnosisMinutes(value.replace(/[^0-9]/g, '').slice(0, 3))
                }
                placeholder="Minutes"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Apprentice progress</Text>
              <View style={styles.progressGrid}>
                {(Object.keys(progressLabels) as ProgressState[]).map((key) => (
                  <SegmentButton
                    key={key}
                    label={progressLabels[key]}
                    selected={progress === key}
                    onPress={() => setProgress(key)}
                  />
                ))}
              </View>
            </View>

            <Field
              label="Manager note"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything that will matter in the next review"
              multiline
            />
          </View>

          {error && (
            <View style={[styles.notice, styles.noticeError]}>
              <Text style={styles.noticeText}>{error}</Text>
            </View>
          )}

          {savedOutcome && (
            <View style={[styles.notice, styles.noticeSuccess]}>
              <Text style={styles.noticeTitle}>Outcome saved</Text>
              <Text style={styles.noticeBody}>
                {savedOutcome.callback
                  ? 'Callback risk is now visible in the manager loop.'
                  : 'First-time fix is recorded for this job.'}
              </Text>
            </View>
          )}

          <Pressable
            disabled={saving || !jobId}
            style={({ pressed }) => [
              styles.saveButton,
              (saving || !jobId) && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={() => void saveOutcome()}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save outcome</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        multiline={multiline}
      />
    </View>
  );
}

function SegmentButton({
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
      style={({ pressed }) => [
        styles.segmentButton,
        selected && styles.segmentSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === 'good' && styles.metricGood,
          tone === 'warn' && styles.metricWarn,
        ]}
      >
        {value}
      </Text>
    </View>
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  headerAction: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  summary: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 5,
  },
  summaryLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  summaryText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  metricGood: {
    color: colors.success,
  },
  metricWarn: {
    color: colors.error,
  },
  formCard: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  inlineInput: {
    width: 112,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentButton: {
    minHeight: 40,
    minWidth: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentTextSelected: {
    color: colors.primary,
  },
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  noticeError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  noticeSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  noticeText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  noticeTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '900',
  },
  noticeBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.76,
  },
});
