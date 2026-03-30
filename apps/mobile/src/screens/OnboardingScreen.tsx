import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { ExperienceLevel, JobDomain } from '@actober/shared-types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const LEVELS: { value: ExperienceLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'BEGINNER', label: 'New to this', desc: "I rarely do physical work", emoji: '🌱' },
  { value: 'INTERMEDIATE', label: 'Some experience', desc: "I've done a few jobs before", emoji: '🔧' },
  { value: 'EXPERIENCED', label: 'I know my way around', desc: "I work with tools regularly", emoji: '⚡' },
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

export default function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setUser } = useActStore();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<ExperienceLevel>('BEGINNER');
  const [domain, setDomain] = useState<JobDomain>('GENERAL');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'name' | 'level' | 'domain'>('name');

  async function handleFinish() {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await api.registerUser(user.deviceId, name.trim() || undefined, level, domain);
      setUser(updated);
      navigation.replace('Main');
    } catch {
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ACT</Text>

        {step === 'name' && (
          <>
            <Text style={styles.heading}>What should ACT call you?</Text>
            <Text style={styles.sub}>Optional — skip if you want.</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textLight}
              autoFocus
              maxLength={40}
              returnKeyType="next"
              onSubmitEditing={() => setStep('level')}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('level')}>
              <Text style={styles.primaryBtnText}>
                {name.trim() ? `Nice to meet you, ${name.trim()}` : 'Skip'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'level' && (
          <>
            <Text style={styles.heading}>
              {name.trim() ? `${name.trim()}, how experienced are you?` : 'How experienced are you?'}
            </Text>
            <Text style={styles.sub}>ACT will calibrate guidance to your level.</Text>
            <View style={styles.cards}>
              {LEVELS.map(l => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.card, level === l.value && styles.cardActive]}
                  onPress={() => setLevel(l.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cardEmoji}>{l.emoji}</Text>
                  <View style={styles.cardText}>
                    <Text style={[styles.cardLabel, level === l.value && styles.cardLabelActive]}>
                      {l.label}
                    </Text>
                    <Text style={styles.cardDesc}>{l.desc}</Text>
                  </View>
                  {level === l.value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('domain')}>
              <Text style={styles.primaryBtnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'domain' && (
          <>
            <Text style={styles.heading}>What do you work on most?</Text>
            <Text style={styles.sub}>ACT will use the right vocabulary and safety guidance for your trade.</Text>
            <View style={styles.domainGrid}>
              {DOMAINS.map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.domainCard, domain === d.value && styles.domainCardActive]}
                  onPress={() => setDomain(d.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.domainEmoji}>{d.emoji}</Text>
                  <Text style={[styles.domainLabel, domain === d.value && styles.domainLabelActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>Let's get to work →</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1, padding: 28,
    paddingTop: 72, justifyContent: 'center',
  },
  brand: {
    fontSize: 20, fontWeight: '900', color: colors.primary,
    letterSpacing: 4, marginBottom: 32,
  },
  heading: {
    fontSize: 26, fontWeight: '800', color: colors.text,
    lineHeight: 34, marginBottom: 8,
  },
  sub: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },

  nameInput: {
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 18, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 16,
  },

  cards: { gap: 12, marginBottom: 28 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '40',
  },
  cardEmoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardLabelActive: { color: colors.primary },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  check: { fontSize: 16, color: colors.primary, fontWeight: '700' },

  domainGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28,
  },
  domainCard: {
    width: '30%', aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 8,
  },
  domainCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '40',
  },
  domainEmoji: { fontSize: 26 },
  domainLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  domainLabelActive: { color: colors.primary },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    padding: 18, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
