import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api } from '../api/act';
import type { ProjectSuggestion } from '@actober/shared-types';
import type { HomeStackParamList, RootStackParamList } from '../navigation/RootNavigator';
import SuggestionCard from '../components/SuggestionCard';
import ResumeBanner from '../components/ResumeBanner';
import { useVoice } from '../hooks/useVoice';
import { usePaywall } from '../hooks/usePaywall';

const SESSION_ID_KEY = 'actober_active_session_id';

const QUICK_CHIPS = [
  '30 minutes free',
  'I have cardboard',
  'I\'m outdoors',
  'No tools, no materials',
  '1 hour + some tools',
  'I have scrap wood',
  'Rainy afternoon indoors',
  'I want to improve a room',
];

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

type NavProp = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const {
    user, session, setSession, clearSession,
    messages, addMessage,
    phase, setPhase,
    suggestions, setSuggestions,
    activeProject, setActiveProject,
    isTyping, setIsTyping,
  } = useActStore();

  const { voiceEnabled, toggleVoice, loadVoicePreference, speak } = useVoice();
  const { canStartProject, remaining, isPlus } = usePaywall();

  useEffect(() => {
    loadVoicePreference();
    if (!session && user) startSession();
  }, [user]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  async function startSession() {
    if (!user) return;
    try {
      const newSession = await api.createSession(user.id);
      setSession(newSession);
      await AsyncStorage.setItem(SESSION_ID_KEY, newSession.id);
      await sendToACT(newSession.id, '__START__');
    } catch {}
  }

  async function handleNewSession() {
    clearSession();
    await AsyncStorage.removeItem(SESSION_ID_KEY);
    if (user) startSession();
  }

  async function sendToACT(sessionId: string, text: string) {
    setIsTyping(true);
    const isStart = text === '__START__';

    if (!isStart) {
      addMessage({
        id: Date.now().toString(),
        sessionId,
        role: 'USER',
        content: text,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      const response = await api.sendMessage(sessionId, isStart ? 'Hello' : text);
      addMessage(response.message);
      setPhase(response.phase);
      if (response.suggestions) setSuggestions(response.suggestions);
      if (response.project) setActiveProject(response.project);
      if (voiceEnabled) speak(response.message.content);
    } catch {
      addMessage({
        id: Date.now().toString(),
        sessionId,
        role: 'ASSISTANT',
        content: "I'm having trouble connecting. Try again in a moment.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !session || isTyping) return;
    setInput('');
    sendToACT(session.id, text);
  }

  function handleChip(chip: string) {
    setInput(chip);
  }

  async function handlePickSuggestion(suggestion: ProjectSuggestion) {
    if (!user || !session) return;

    // Paywall gate
    if (!canStartProject) {
      navigation.navigate('Paywall' as any);
      return;
    }

    setSuggestions(null);

    try {
      const project = await api.commitToProject({
        userId: user.id,
        sessionId: session.id,
        suggestion,
        contextSnapshot: messages
          .filter(m => m.role === 'USER')
          .slice(0, 3)
          .map(m => m.content)
          .join(' / '),
      });

      setActiveProject(project);
      setPhase('COACHING');
      await sendToACT(session.id, `Let's do: ${suggestion.title}`);
      navigation.navigate('Project', { projectId: project.id });
    } catch {}
  }

  const visibleMessages = messages.filter(m => !(m.role === 'USER' && m.content === 'Hello'));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            ACTOBER <Text style={styles.headerAI}>AI</Text>
          </Text>
          {user?.name && (
            <Text style={styles.headerGreeting}>Hey {user.name}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {!isPlus && remaining < 3 && (
            <TouchableOpacity
              style={styles.remainingBadge}
              onPress={() => navigation.navigate('Paywall' as any)}
            >
              <Text style={styles.remainingText}>{remaining} left</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.voiceBtn, voiceEnabled && styles.voiceBtnOn]}
            onPress={toggleVoice}
          >
            <Text style={styles.voiceBtnText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={handleNewSession}>
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Resume banner — always shown when there's an active project */}
        {activeProject && activeProject.status === 'IN_PROGRESS' && (
          <ResumeBanner
            project={activeProject}
            onResume={() => navigation.navigate('Project', { projectId: activeProject.id })}
          />
        )}

        {visibleMessages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubble, msg.role === 'USER' ? styles.userBubble : styles.actBubble]}
          >
            {msg.role === 'ASSISTANT' && <Text style={styles.actLabel}>ACT</Text>}
            <Text style={[
              styles.bubbleText,
              msg.role === 'USER' ? styles.userBubbleText : styles.actBubbleText,
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.actBubble]}>
            <Text style={styles.actLabel}>ACT</Text>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}

        {suggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Pick a project:</Text>
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                suggestion={s}
                color={CATEGORY_COLORS[s.category] ?? colors.primary}
                onPress={() => handlePickSuggestion(s)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Quick-start chips (only in DISCOVERY phase) */}
      {phase === 'DISCOVERY' && messages.length <= 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="always"
        >
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleChip(chip)}>
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tell ACT what's around you..."
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isTyping}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 1 },
  headerAI: { color: colors.primary },
  headerGreeting: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remainingBadge: {
    backgroundColor: colors.primaryLight + '80', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  remainingText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  voiceBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  voiceBtnOn: { backgroundColor: colors.primaryLight + '80', borderColor: colors.primary },
  voiceBtnText: { fontSize: 16 },
  newBtn: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 8 },

  bubble: {
    maxWidth: '82%', borderRadius: 16, padding: 12, marginBottom: 2,
  },
  actBubble: {
    alignSelf: 'flex-start', backgroundColor: colors.actBubble,
    borderWidth: 1, borderColor: colors.actBubbleBorder, borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: colors.userBubble, borderTopRightRadius: 4,
  },
  actLabel: {
    fontSize: 9, fontWeight: '800', color: colors.primary,
    marginBottom: 5, letterSpacing: 1.5,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  actBubbleText: { color: colors.text },
  userBubbleText: { color: '#fff' },

  suggestionsContainer: { marginTop: 6, gap: 10 },
  suggestionsLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  chipsRow: {
    flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: colors.surfaceAlt, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' },
});
