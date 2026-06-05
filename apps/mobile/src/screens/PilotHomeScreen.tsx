import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

// Pilot targets (goal, not live counts — live counts come from /dashboard/summary later).
const targetStats = [
  { label: 'pilot days', value: '60' },
  { label: 'jobs captured', value: '20' },
  { label: 'cards published', value: '50' },
];

const workflow = ['Record', 'Mark', 'Review', 'Teach', 'Measure'];

export default function PilotHomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>HVAC · Field Capture</Text>
          <Text style={styles.title}>Capture what your best techs know.</Text>
          <Text style={styles.subtitle}>
            Record the job, mark the teachable moment, review, publish. The judgment that
            prevents callbacks, captured before it retires.
          </Text>
        </View>

        <View style={styles.actionBand}>
          <ActionButton
            label="Record senior tech"
            detail="Capture the call and mark what matters"
            variant="primary"
            onPress={() => navigation.navigate('CaptureJob')}
          />
          <ActionButton
            label="Apprentice training"
            detail="Open reviewed cards and quick checks"
            onPress={() => navigation.navigate('Learn')}
          />
          <ActionButton
            label="Measure outcome"
            detail="Log first-time fix, callback, and ramp"
            onPress={() => navigation.navigate('PilotOutcome', undefined)}
          />
        </View>

        <Text style={styles.sectionLabel}>Pilot target</Text>
        <View style={styles.statsRow}>
          {targetStats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.workflowBand}>
          {workflow.map((step, index) => (
            <React.Fragment key={step}>
              <View style={styles.workflowStep}>
                <Text style={styles.workflowNumber}>{index + 1}</Text>
                <Text style={styles.workflowLabel}>{step}</Text>
              </View>
              {index < workflow.length - 1 && <View style={styles.workflowLine} />}
            </React.Fragment>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.legacyLink, pressed && styles.pressed]}
          onPress={() => navigation.navigate('AskAct')}
        >
          <Text style={styles.legacyLinkText}>Legacy photo diagnosis →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  detail,
  variant = 'secondary',
  onPress,
}: {
  label: string;
  detail: string;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.primaryAction : styles.secondaryAction,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionLabel, primary && styles.primaryActionText]}>
        {label}
      </Text>
      <Text style={[styles.actionDetail, primary && styles.primaryActionDetail]}>
        {detail}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  header: { paddingTop: 8, gap: 8 },
  kicker: { ...labelStyle, color: colors.primary, fontSize: 12 },
  title: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.display, // bold Geist (so it isn't flattened by the global default)
  },
  subtitle: {
    color: colors.steel500,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
    fontFamily: fonts.body,
  },
  actionBand: { gap: 10 },
  actionButton: {
    minHeight: 88,
    borderRadius: 6,
    padding: 18,
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryPressed,
  },
  secondaryAction: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.steel300,
  },
  actionLabel: { color: colors.ink, fontSize: 19, fontFamily: fonts.semibold },
  actionDetail: { color: colors.steel500, fontSize: 14, marginTop: 5, fontFamily: fonts.body },
  primaryActionText: { color: '#FFFFFF' },
  primaryActionDetail: { color: 'rgba(255,255,255,0.85)' },
  pressed: { opacity: 0.8 },
  sectionLabel: { ...labelStyle, color: colors.steel500, marginBottom: -6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    minHeight: 80,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    padding: 14,
    justifyContent: 'center',
  },
  statValue: { color: colors.ink, fontSize: 26, fontFamily: fonts.mono }, // mono = instrument
  statLabel: { ...labelStyle, color: colors.steel500, fontSize: 10, marginTop: 4 },
  workflowBand: {
    minHeight: 80,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workflowStep: { alignItems: 'center', minWidth: 50 },
  workflowNumber: {
    width: 26,
    height: 26,
    borderRadius: 3, // square instrument chip, not a round pill
    backgroundColor: colors.ink,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: fonts.monoSemibold,
    fontSize: 13,
    marginBottom: 6,
    overflow: 'hidden',
  },
  workflowLabel: { ...labelStyle, color: colors.steel700, fontSize: 9 },
  workflowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    marginBottom: 20,
  },
  legacyLink: { alignItems: 'center', paddingVertical: 6 },
  legacyLinkText: { color: colors.textLight, fontSize: 13, fontFamily: fonts.mono },
});
