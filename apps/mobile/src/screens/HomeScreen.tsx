import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';
import { useActoberStore } from '../store/actober';
import { Colors } from '../theme/colors';
import { Trade } from '@actober/shared-types';

type Props = {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
};

const TRADES: { id: Trade; label: string; icon: string }[] = [
  { id: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { id: 'HVAC', label: 'HVAC', icon: '❄️' },
  { id: 'PLUMBING', label: 'Plumbing', icon: '🔧' },
  { id: 'WELDING', label: 'Welding', icon: '🔥' },
];

const SCENARIOS_BY_TRADE: Record<Trade, Array<{ icon: string; label: string; description: string }>> = {
  ELECTRICAL: [
    { icon: '🔌', label: 'Panel Inspection', description: 'Identify breakers, hazards, capacity' },
    { icon: '⚡', label: 'Wire ID', description: 'Identify wiring era and gauge' },
    { icon: '🏠', label: 'Retrofit Wiring', description: 'Old building rewire guidance' },
    { icon: '⚠️', label: 'Safety Check', description: 'Full site hazard assessment' },
  ],
  HVAC: [
    { icon: '❄️', label: 'System Diagnosis', description: 'Identify cooling/heating faults' },
    { icon: '🌡️', label: 'Thermostat Wiring', description: 'R, Y, G, W, C wire identification' },
    { icon: '🔥', label: 'Heat Exchanger', description: 'Inspect for cracks and CO risk' },
    { icon: '⚠️', label: 'Refrigerant Safety', description: 'EPA 608 handling procedures' },
  ],
  PLUMBING: [
    { icon: '🔧', label: 'Pipe ID', description: 'Identify pipe material and size' },
    { icon: '💧', label: 'Leak Diagnosis', description: 'Find and trace leak sources' },
    { icon: '🚿', label: 'DWV Rough-in', description: 'Drain, waste, vent layout' },
    { icon: '⚠️', label: 'Safety Check', description: 'Gas, water pressure, backflow' },
  ],
  WELDING: [
    { icon: '🔥', label: 'Joint Setup', description: 'Fit-up, preheat, and prep' },
    { icon: '⚡', label: 'Process Setup', description: 'MIG, TIG, stick settings' },
    { icon: '🔍', label: 'Weld Inspection', description: 'Visual inspection and defects' },
    { icon: '⚠️', label: 'Safety Check', description: 'PPE, ventilation, fire watch' },
  ],
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomeScreen({ navigation }: Props) {
  const { currentUser, sessions, setTrade } = useActoberStore();
  const activeTrade = currentUser?.trade ?? 'ELECTRICAL';
  const recentSessions = sessions.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>ACTOBER</Text>
          <Text style={styles.tagline}>Act on what you see.</Text>
        </View>

        {/* Trade Selector */}
        <Text style={styles.sectionLabel}>SELECT TRADE</Text>
        <View style={styles.tradeRow}>
          {TRADES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tradePill, activeTrade === t.id && styles.tradePillActive]}
              onPress={() => setTrade(t.id)}
            >
              <Text style={styles.tradeIcon}>{t.icon}</Text>
              <Text style={[styles.tradeLabel, activeTrade === t.id && styles.tradeLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scenario Cards — trade-specific */}
        <Text style={styles.sectionLabel}>QUICK SCENARIOS</Text>
        <View style={styles.scenarioGrid}>
          {SCENARIOS_BY_TRADE[activeTrade].map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.scenarioCard}
              onPress={() => navigation.navigate('Field')}
            >
              <Text style={styles.scenarioIcon}>{s.icon}</Text>
              <Text style={styles.scenarioLabel}>{s.label}</Text>
              <Text style={styles.scenarioDesc}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Field')}
        >
          <Text style={styles.ctaText}>START FIELD SESSION</Text>
        </TouchableOpacity>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>
            {recentSessions.map((s) => (
              <View key={s.id} style={styles.sessionCard}>
                <Text style={styles.sessionTrade}>{s.trade}</Text>
                <Text style={styles.sessionAddress}>{s.jobAddress || 'No address'}</Text>
                <Text style={styles.sessionTime}>{timeAgo(s.startedAt)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 32, marginTop: 8 },
  wordmark: {
    fontFamily: 'Courier New',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
    marginTop: 4,
  },
  tradeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  tradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tradePillActive: {
    borderColor: Colors.primary,
    backgroundColor: '#1A0E06',
  },
  tradeIcon: { fontSize: 14 },
  tradeLabel: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: Colors.textMuted,
  },
  tradeLabelActive: { color: Colors.primary },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  scenarioCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  scenarioIcon: { fontSize: 22, marginBottom: 8 },
  scenarioLabel: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  scenarioDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaText: {
    fontFamily: 'Courier New',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  sessionTrade: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  sessionAddress: { fontSize: 13, color: Colors.text, marginBottom: 2 },
  sessionTime: { fontSize: 11, color: Colors.textMuted },
});
