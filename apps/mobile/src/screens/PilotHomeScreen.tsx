import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { colors } from '../theme/colors';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

const targetStats = [
  { label: 'shops', value: '3' },
  { label: 'captured jobs', value: '20' },
  { label: 'training cards', value: '50' },
];

const workflow = ['Consent', 'Capture', 'Review', 'Learn'];

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
          <Text style={styles.kicker}>HVAC pilot</Text>
          <Text style={styles.title}>ACT Capture</Text>
          <Text style={styles.subtitle}>
            Your best techs train the next generation without writing documentation.
          </Text>
        </View>

        <View style={styles.actionBand}>
          <ActionButton
            label="Start capture"
            detail="Senior tech job recording"
            variant="primary"
            onPress={() => navigation.navigate('CaptureJob')}
          />
          <ActionButton
            label="Learn"
            detail="Reviewed apprentice cards"
            onPress={() => navigation.navigate('Learn')}
          />
        </View>

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

        <View style={styles.secondaryBand}>
          <View style={styles.secondaryCopy}>
            <Text style={styles.secondaryTitle}>Legacy diagnosis</Text>
            <Text style={styles.secondaryText}>Photo and voice troubleshooting remains available.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('AskAct')}
          >
            <Text style={styles.secondaryButtonText}>Open</Text>
          </Pressable>
        </View>
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  header: {
    paddingTop: 10,
    gap: 6,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 340,
  },
  actionBand: {
    gap: 10,
  },
  actionButton: {
    minHeight: 96,
    borderRadius: 8,
    padding: 18,
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondaryAction: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  actionDetail: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  primaryActionDetail: {
    color: 'rgba(255,255,255,0.84)',
  },
  pressed: {
    opacity: 0.78,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  workflowBand: {
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workflowStep: {
    alignItems: 'center',
    minWidth: 58,
  },
  workflowNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  workflowLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  workflowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    marginBottom: 22,
  },
  secondaryBand: {
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryCopy: {
    flex: 1,
  },
  secondaryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  secondaryButton: {
    minWidth: 76,
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '900',
  },
});
