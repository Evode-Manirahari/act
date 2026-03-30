import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const FEATURES = [
  { emoji: '⚡', label: 'Unlimited guided projects', free: false },
  { emoji: '🎙️', label: 'Voice guidance from ACT', free: false },
  { emoji: '📋', label: 'Full project history', free: false },
  { emoji: '🌱', label: '3 projects per month', free: true },
  { emoji: '🔧', label: 'Beginner project suggestions', free: true },
];

interface Props {
  onUpgrade: () => void;
}

export default function PaywallScreen({ onUpgrade }: Props) {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brand}>ACT</Text>
          <View style={styles.plusBadge}>
            <Text style={styles.plusText}>PLUS</Text>
          </View>
        </View>

        <Text style={styles.heading}>You've built your 3 free projects this month.</Text>
        <Text style={styles.sub}>
          Upgrade to ACT Plus to keep building. Unlimited projects, voice guidance, and deeper coaching.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={[styles.featureLabel, f.free && styles.featureLabelFree]}>
                {f.label}
              </Text>
              {f.free
                ? <Text style={styles.freeTag}>Free</Text>
                : <Text style={styles.plusTag}>Plus</Text>
              }
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.price}>$4.99</Text>
          <Text style={styles.pricePer}>per month</Text>
        </View>

        <TouchableOpacity style={styles.upgradeBtn} onPress={() => { onUpgrade(); navigation.goBack(); }}>
          <Text style={styles.upgradeBtnText}>Upgrade to ACT Plus</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Cancel anytime. Payment coming soon — tap to unlock early access.
        </Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  brand: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 2 },
  plusBadge: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  plusText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  heading: { fontSize: 24, fontWeight: '800', color: colors.text, lineHeight: 32, marginBottom: 10 },
  sub: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: 28 },

  featureList: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureEmoji: { fontSize: 20, width: 28 },
  featureLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  featureLabelFree: { color: colors.textMuted },
  freeTag: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  plusTag: {
    fontSize: 11, fontWeight: '700', color: colors.primary,
    backgroundColor: colors.primaryLight + '60', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },

  priceCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  price: { fontSize: 40, fontWeight: '800', color: colors.text },
  pricePer: { fontSize: 14, color: colors.textMuted },

  upgradeBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 12,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  legal: { fontSize: 12, color: colors.textLight, textAlign: 'center', marginBottom: 24 },

  backBtn: { alignItems: 'center' },
  backBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
