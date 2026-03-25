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
import type { ExperienceLevel } from '@actober/shared-types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const LEVELS: { value: ExperienceLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'BEGINNER', label: 'New to this', desc: "I rarely build or make things", emoji: '🌱' },
  { value: 'INTERMEDIATE', label: 'Some experience', desc: "I've done a few projects before", emoji: '🔧' },
  { value: 'EXPERIENCED', label: 'Pretty handy', desc: "I build or make things regularly", emoji: '⚡' },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, setUser } = useActStore();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<ExperienceLevel>('BEGINNER');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'name' | 'level'>('name');

  async function handleFinish() {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await api.registerUser(user.deviceId, name.trim() || undefined, level);
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
        <Text style={styles.brand}>ACTOBER</Text>

        {step === 'name' ? (
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
        ) : (
          <>
            <Text style={styles.heading}>
              {name.trim() ? `${name.trim()}, how much do you make things?` : 'How much do you make things?'}
            </Text>
            <Text style={styles.sub}>ACT will suggest the right kind of project.</Text>

            <View style={styles.levels}>
              {LEVELS.map(l => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.levelCard, level === l.value && styles.levelCardActive]}
                  onPress={() => setLevel(l.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.levelEmoji}>{l.emoji}</Text>
                  <View style={styles.levelText}>
                    <Text style={[styles.levelLabel, level === l.value && styles.levelLabelActive]}>
                      {l.label}
                    </Text>
                    <Text style={styles.levelDesc}>{l.desc}</Text>
                  </View>
                  {level === l.value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>Let's build something →</Text>
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
    fontSize: 13, fontWeight: '800', color: colors.primary,
    letterSpacing: 3, marginBottom: 32,
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

  levels: { gap: 12, marginBottom: 28 },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: colors.border,
  },
  levelCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '40',
  },
  levelEmoji: { fontSize: 24 },
  levelText: { flex: 1 },
  levelLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  levelLabelActive: { color: colors.primary },
  levelDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  check: { fontSize: 16, color: colors.primary, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    padding: 18, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
