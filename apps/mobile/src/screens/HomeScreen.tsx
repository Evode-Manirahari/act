import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Pressable,
  Modal, Switch, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api, streamChat } from '../api/act';
import type { ProjectSuggestion } from '@actober/shared-types';
import type { HomeStackParamList, RootStackParamList } from '../navigation/RootNavigator';
import SuggestionCard from '../components/SuggestionCard';
import ResumeBanner from '../components/ResumeBanner';
import { useVoice } from '../hooks/useVoice';
import { usePaywall } from '../hooks/usePaywall';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useNotifications } from '../hooks/useNotifications';
import { useStreak } from '../hooks/useStreak';

const SESSION_ID_KEY = 'actober_active_session_id';

const QUICK_CHIPS_BY_DOMAIN: Record<string, string[]> = {
  PLUMBING: ['Leaking pipe under the sink', 'Unblock a drain', 'Replace a faucet', 'Water heater issue', 'Running toilet', 'Low water pressure'],
  ELECTRICAL: ['Outlet not working', 'Replace a light fixture', 'Running new cable', 'Tripped breaker won\'t reset', 'Install a ceiling fan', 'GFCI outlet issue'],
  CARPENTRY: ['Door won\'t close properly', 'Fixing a squeaky floor', 'Install door trim', 'Cabinet door hinge broken', 'Build a shelf', 'Deck board replacement'],
  HVAC: ['AC not cooling', 'Furnace won\'t ignite', 'Replace air filter', 'Noisy ductwork', 'Thermostat not responding', 'Vent airflow weak'],
  PAINTING: ['Patching drywall', 'Prep walls for painting', 'Fix paint peeling', 'Caulk gaps before painting', 'Touch up scuffs', 'Painting trim'],
  TILING: ['Cracked tile needs replacing', 'Re-grout bathroom floor', 'Tile is coming loose', 'Caulk around tub', 'Lay new floor tile', 'Backsplash install'],
  GENERAL: ['Leaking pipe under the sink', 'Outlet not working', 'Door won\'t close properly', 'Fixing a squeaky floor', 'Patching drywall', 'Replace a light fixture', 'Running new cable', 'Unblock a drain'],
};

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

type NavProp = NativeStackNavigationProp<HomeStackParamList & RootStackParamList>;

type PendingImage = { uri: string; base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' };

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const streamingIdRef = useRef<string | null>(null);

  const {
    user, session, setSession, clearSession,
    messages, addMessage, appendToMessage, replaceMessage,
    phase, setPhase,
    suggestions, setSuggestions,
    activeProject, setActiveProject,
    isTyping, setIsTyping,
  } = useActStore();

  const { voiceEnabled, toggleVoice, loadVoicePreference, speak } = useVoice();
  const { canStartProject, remaining, isPlus } = usePaywall();
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceInput();
  const { prefs, loaded: notifLoaded, enable: enableNotif, disable: disableNotif, setTime: setNotifTime } = useNotifications();
  const { streak } = useStreak();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifSlide = useRef(new Animated.Value(300)).current;

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

  function openNotifPanel() {
    setShowNotifPanel(true);
    Animated.spring(notifSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }

  function closeNotifPanel() {
    Animated.timing(notifSlide, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => {
      setShowNotifPanel(false);
    });
  }

  async function handleToggleNotifications(val: boolean) {
    if (val) {
      await enableNotif({ streak, domain: user?.domain ?? null, lastProjectTitle: null });
    } else {
      await disableNotif();
    }
  }

  async function handleSetNotifTime(hour: number) {
    await setNotifTime(hour, { streak, domain: user?.domain ?? null, lastProjectTitle: null });
  }

  async function handleCameraCapture() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      // Try camera
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus.status !== 'granted') return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false, // we'll do this after resize
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Resize to max 1024px on longest side for API efficiency
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!manipulated.base64) return;
    setPendingImage({ uri: manipulated.uri, base64: manipulated.base64, mimeType: 'image/jpeg' });
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!manipulated.base64) return;
    setPendingImage({ uri: manipulated.uri, base64: manipulated.base64, mimeType: 'image/jpeg' });
  }

  async function sendToACT(sessionId: string, text: string, image?: PendingImage) {
    setIsTyping(true);
    const isStart = text === '__START__';

    if (!isStart) {
      addMessage({
        id: Date.now().toString(),
        sessionId,
        role: 'USER',
        content: image ? `📷 ${text || 'What do you see?'}` : text,
        createdAt: new Date().toISOString(),
      });
    }

    // Add streaming placeholder for ACT response
    const streamId = `stream_${Date.now()}`;
    streamingIdRef.current = streamId;
    addMessage({
      id: streamId,
      sessionId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await streamChat(
        sessionId,
        isStart ? 'Hello' : text || 'What do you see?',
        {
          imageBase64: image?.base64,
          imageMimeType: image?.mimeType,
          onDelta: (delta) => {
            appendToMessage(streamId, delta);
          },
        }
      );

      // Replace streaming stub with persisted message from server
      replaceMessage(streamId, response.message);
      setPhase(response.phase);
      if (response.suggestions) setSuggestions(response.suggestions);
      if (response.project) setActiveProject(response.project);
      if (voiceEnabled) speak(response.message.content);
    } catch {
      replaceMessage(streamId, {
        id: streamId,
        sessionId,
        role: 'ASSISTANT',
        content: "I'm having trouble connecting. Try again in a moment.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
      streamingIdRef.current = null;
    }
  }

  function handleSend() {
    const text = input.trim();
    if ((!text && !pendingImage) || !session || isTyping) return;
    const image = pendingImage;
    setInput('');
    setPendingImage(null);
    sendToACT(session.id, text, image ?? undefined);
  }

  function handleChip(chip: string) {
    setInput(chip);
  }

  async function handlePickSuggestion(suggestion: ProjectSuggestion) {
    if (!user || !session) return;

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
      await sendToACT(session.id, `Let's do this: ${suggestion.title}`);
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
          <Text style={styles.headerTitle}>ACT</Text>
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
          <TouchableOpacity
            style={[styles.voiceBtn, prefs.enabled && styles.voiceBtnOn]}
            onPress={openNotifPanel}
          >
            <Text style={styles.voiceBtnText}>{prefs.enabled ? '🔔' : '🔕'}</Text>
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
            {msg.role === 'ASSISTANT' && msg.content === '' && (
              <ActivityIndicator size="small" color={colors.textMuted} />
            )}
          </View>
        ))}

        {suggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Pick a job:</Text>
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

      {/* Quick-start chips (only in DISCOVERY phase early in convo) */}
      {phase === 'DISCOVERY' && messages.length <= 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="always"
        >
          {(QUICK_CHIPS_BY_DOMAIN[user?.domain ?? ''] ?? QUICK_CHIPS_BY_DOMAIN.GENERAL).map((chip) => (
            <TouchableOpacity key={chip} style={styles.chip} onPress={() => handleChip(chip)}>
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: pendingImage.uri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.imageRemove} onPress={() => setPendingImage(null)}>
            <Text style={styles.imageRemoveText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.imagePreviewLabel}>Photo ready to send</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto} disabled={isTyping}>
          <Text style={styles.cameraBtnText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cameraBtn} onPress={handleCameraCapture} disabled={isTyping}>
          <Text style={styles.cameraBtnText}>🖼</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={pendingImage ? 'Add a note... (or just send)' : 'Describe the job or ask a question...'}
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {/* Mic button — press and hold to record, release to transcribe + send */}
        <Pressable
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPressIn={() => !isTyping && startRecording()}
          onPressOut={async () => {
            const text = await stopRecording();
            if (text) {
              setInput((prev) => prev ? `${prev} ${text}` : text);
            }
          }}
          onLongPress={() => {}} // prevents cancel on long press
          disabled={isTyping}
        >
          {isTranscribing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎙'}</Text>
          }
        </Pressable>

        <TouchableOpacity
          style={[styles.sendBtn, ((!input.trim() && !pendingImage) || isTyping) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={(!input.trim() && !pendingImage) || isTyping}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Notification settings panel */}
      <NotificationPanel
        visible={showNotifPanel}
        slideAnim={notifSlide}
        enabled={prefs.enabled}
        hour={prefs.hour}
        onToggle={handleToggleNotifications}
        onSetTime={handleSetNotifTime}
        onClose={closeNotifPanel}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Notification Panel ───────────────────────────────────────────────────────

const NOTIFY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function NotificationPanel({
  visible, slideAnim, enabled, hour, onToggle, onSetTime, onClose,
}: {
  visible: boolean;
  slideAnim: Animated.Value;
  enabled: boolean;
  hour: number;
  onToggle: (val: boolean) => void;
  onSetTime: (hour: number) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={notifStyles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[notifStyles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={notifStyles.handle} />

        <View style={notifStyles.row}>
          <View>
            <Text style={notifStyles.title}>Daily Reminder</Text>
            <Text style={notifStyles.subtitle}>
              {enabled ? `ACT reminds you at ${formatHour(hour)}` : 'Off — ACT won\'t remind you'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary + 'A0' }}
            thumbColor={enabled ? colors.primary : colors.textLight}
          />
        </View>

        {enabled && (
          <>
            <Text style={notifStyles.timeLabel}>Remind me at</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={notifStyles.timeChips}
            >
              {NOTIFY_HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[notifStyles.chip, h === hour && notifStyles.chipActive]}
                  onPress={() => onSetTime(h)}
                >
                  <Text style={[notifStyles.chipText, h === hour && notifStyles.chipTextActive]}>
                    {formatHour(h)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={notifStyles.previewBox}>
              <Text style={notifStyles.previewLabel}>Preview</Text>
              <Text style={notifStyles.previewTitle}>ACT</Text>
              <Text style={notifStyles.previewBody}>
                {hour < 12 ? "What are you working on today?" :
                 hour < 17 ? "Good time to get a job done." :
                             "Evening. Quick fix before you wind down?"}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={notifStyles.doneBtn} onPress={onClose}>
          <Text style={notifStyles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const notifStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  timeLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },
  timeChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#fff' },

  previewBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: 14,
    padding: 14, gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  previewLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4,
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  previewBody: { fontSize: 14, color: colors.text, lineHeight: 20 },

  doneBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.primary, letterSpacing: 3 },
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

  bubble: { maxWidth: '82%', borderRadius: 16, padding: 12, marginBottom: 2 },
  actBubble: {
    alignSelf: 'flex-start', backgroundColor: colors.actBubble,
    borderWidth: 1, borderColor: colors.actBubbleBorder, borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: colors.userBubble, borderTopRightRadius: 4,
  },
  actLabel: { fontSize: 9, fontWeight: '800', color: colors.primary, marginBottom: 5, letterSpacing: 1.5 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  actBubbleText: { color: colors.text },
  userBubbleText: { color: '#fff' },

  suggestionsContainer: { marginTop: 6, gap: 10 },
  suggestionsLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  chipsRow: { flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },

  imagePreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  imagePreview: { width: 48, height: 48, borderRadius: 8 },
  imageRemove: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  imageRemoveText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  imagePreviewLabel: { fontSize: 12, color: colors.textMuted, flex: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, gap: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cameraBtn: {
    width: 40, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnText: { fontSize: 22 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: colors.surfaceAlt, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  micBtnActive: {
    backgroundColor: colors.error, borderColor: colors.error,
  },
  micBtnText: { fontSize: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' },
});
