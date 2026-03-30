import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { ExperienceLevel, JobDomain } from '@actober/shared-types';
import { usePaywall } from '../hooks/usePaywall';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const LEVELS: { value: ExperienceLevel; label: string; emoji: string }[] = [
  { value: 'BEGINNER', label: 'New to this', emoji: '🌱' },
  { value: 'INTERMEDIATE', label: 'Some experience', emoji: '🔧' },
  { value: 'EXPERIENCED', label: 'Seasoned hand', emoji: '⚡' },
];

const DOMAINS: { value: JobDomain; label: string; emoji: string }[] = [
  { value: 'PLUMBING', label: 'Plumbing', emoji: '🔧' },
  { value: 'ELECTRICAL', label: 'Electrical', emoji: '⚡' },
  { value: 'CARPENTRY', label: 'Carpentry', emoji: '🪵' },
  { value: 'HVAC', label: 'HVAC', emoji: '❄️' },
  { value: 'PAINTING', label: 'Painting', emoji: '🖌️' },
  { value: 'TILING', label: 'Tiling', emoji: '🧱' },
  { value: 'GENERAL', label: 'General / Mixed', emoji: '🔩' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setUser } = useActStore();
  const { isPlus, remaining, activatePlus } = usePaywall();

  const [name, setName] = useState(user?.name ?? '');
  const [level, setLevel] = useState<ExperienceLevel>(user?.experienceLevel ?? 'BEGINNER');
  const [domain, setDomain] = useState<JobDomain>(user?.domain ?? 'GENERAL');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    name.trim() !== (user?.name ?? '') ||
    level !== user?.experienceLevel ||
    domain !== user?.domain;

  async function handleSave() {
    if (!user || !hasChanges) return;
    setSaving(true);
    try {
      const updated = await api.registerUser(user.deviceId, name.trim() || undefined, level, domain);
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          {user?.name && <Text style={styles.headerSub}>{user.name}</Text>}
        </View>

        {/* Subscription status */}
        <View style={[styles.subBanner, isPlus && styles.subBannerPlus]}>
          <View>
            <Text style={[styles.subTitle, isPlus && styles.subTitlePlus]}>
              {isPlus ? 'ACT Plus' : 'Free Plan'}
            </Text>
            <Text style={styles.subSub}>
              {isPlus
                ? 'Unlimited projects and voice guidance'
                : `${remaining} project${remaining === 1 ? '' : 's'} left this month`}
            </Text>
          </View>
          {!isPlus && (
            <TouchableOpacity
              style={styles.upgradeChip}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upgradeChipText}>Upgrade</Text>
            </TouchableOpacity>
          )}
          {isPlus && (
            <View style={styles.plusBadge}>
              <Text style={styles.plusBadgeText}>PLUS</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.sectionLabel}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="What should ACT call you?"
          placeholderTextColor={colors.textLight}
          maxLength={40}
          returnKeyType="done"
        />

        {/* Experience */}
        <Text style={styles.sectionLabel}>Experience Level</Text>
        <View style={styles.optionRow}>
          {LEVELS.map(l => (
            <TouchableOpacity
              key={l.value}
              style={[styles.optionChip, level === l.value && styles.optionChipActive]}
              onPress={() => setLevel(l.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{l.emoji}</Text>
              <Text style={[styles.optionLabel, level === l.value && styles.optionLabelActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Domain */}
        <Text style={styles.sectionLabel}>Trade</Text>
        <View style={styles.domainGrid}>
          {DOMAINS.map(d => (
            <TouchableOpacity
              key={d.value}
              style={[styles.domainCard, domain === d.value && styles.domainCardActive]}
              onPress={() => setDomain(d.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.domainEmoji}>{d.emoji}</Text>
              <Text style={[styles.domainLabel, domain === d.value && styles.domainLabelActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!hasChanges || saving) && styles.saveBtnDisabled,
            saved && styles.saveBtnSaved,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>{saved ? 'Saved ✓' : 'Save Changes'}</Text>
          }
        </TouchableOpacity>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ACT — AI guidance for physical work</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 60 },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  subBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 20, padding: 16,
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  subBannerPlus: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  subTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  subTitlePlus: { color: colors.primary },
  subSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  upgradeChip: {
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  upgradeChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  plusBadge: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  plusBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 24, marginBottom: 10,
  },

  nameInput: {
    marginHorizontal: 20,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },

  optionRow: { flexDirection: 'column', gap: 8, marginHorizontal: 20 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 2, borderColor: colors.border,
  },
  optionChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '40',
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  optionLabelActive: { color: colors.primary },

  domainGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginHorizontal: 20,
  },
  domainCard: {
    width: '30%', aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8,
  },
  domainCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '40',
  },
  domainEmoji: { fontSize: 26 },
  domainLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  domainLabelActive: { color: colors.primary },

  saveBtn: {
    margin: 20, marginTop: 28,
    backgroundColor: colors.primary, borderRadius: 14,
    padding: 17, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnSaved: { backgroundColor: colors.success },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  footer: { alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 8 },
  footerText: { fontSize: 12, color: colors.textLight },
  footerVersion: { fontSize: 11, color: colors.textLight },
});
