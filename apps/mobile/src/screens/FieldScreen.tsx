import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useActoberStore } from '../store/actober';
import { Colors } from '../theme/colors';
import { Message, Trade } from '@actober/shared-types';
import {
  registerUser,
  createSession,
  sendMessage as apiSendMessage,
  patchSession,
  ApiError,
} from '../api/actober';
import ActoberCamera, { CameraStandby, CaptureResult } from '../components/ActoberCamera';
import VoiceInput from '../components/VoiceInput';
import OfflineBanner from '../components/OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { matchOfflineQuery } from '@actober/trade-knowledge';
import {
  enqueueMessage,
  loadQueue,
  removeFromQueue,
  backupSessionMessages,
} from '../utils/offlineQueue';

const DEVICE_ID_KEY = 'actober:deviceId';

const QUICK_CHIPS_BY_TRADE: Record<Trade, Array<{ label: string; message: string }>> = {
  ELECTRICAL: [
    { label: '⚠️ Safety', message: 'Safety check: is everything I described safe to proceed with?' },
    { label: '🔧 Next step', message: 'What is my next step right now?' },
    { label: '📋 Code?', message: 'What does the current code require for this situation?' },
    { label: '🔌 Identify', message: 'Help me identify this wire or component' },
  ],
  HVAC: [
    { label: '⚠️ Safety', message: 'Safety check: is it safe to proceed with this HVAC task?' },
    { label: '🔧 Next step', message: 'What is my next step for this HVAC repair?' },
    { label: '📋 Code?', message: 'What does current mechanical code require for this?' },
    { label: '❄️ Refrigerant', message: 'What refrigerant handling procedures apply here?' },
  ],
  PLUMBING: [
    { label: '⚠️ Safety', message: 'Safety check: is it safe to proceed with this plumbing work?' },
    { label: '🔧 Next step', message: 'What is my next step for this plumbing repair?' },
    { label: '📋 Code?', message: 'What does current plumbing code require here?' },
    { label: '🔧 Identify', message: 'Help me identify this pipe, fitting, or component' },
  ],
  WELDING: [
    { label: '⚠️ Safety', message: 'Safety check: is it safe to proceed with this weld?' },
    { label: '🔧 Setup', message: 'What are my welder settings for this material and position?' },
    { label: '📋 Spec?', message: 'What does the welding spec or code require for this joint?' },
    { label: '🔍 Inspect', message: 'How do I inspect this weld for defects?' },
  ],
};

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

function stripEmoji(text: string): string {
  return text.replace(EMOJI_REGEX, '').trim();
}

// ── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'USER';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (msg.isSafetyAlert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [msg.isSafetyAlert]);

  if (msg.isSafetyAlert) {
    return (
      <Animated.View style={[styles.safetyBubble, { opacity: pulseAnim }]}>
        <Text style={styles.safetyLabel}>⚠️ SAFETY ALERT</Text>
        <Text style={styles.safetyText}>{msg.content}</Text>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {!isUser && <Text style={styles.actLabel}>ACT</Text>}
      <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{msg.content}</Text>
    </View>
  );
}

// ── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Text style={styles.actLabel}>ACT</Text>
      <View style={styles.typingDots}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

// ── Field Screen ─────────────────────────────────────────────────────────────

export default function FieldScreen() {
  const {
    currentUser, activeSession, voiceEnabled, cameraEnabled, handsFreeMode,
    toggleVoice, toggleCamera, toggleHandsFree,
    setUser, startSession, addMessage,
  } = useActoberStore();

  const { isOnline, isSyncing, setIsSyncing } = useNetworkStatus();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [handsFreeListening, setHandsFreeListening] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const appStateRef = useRef(AppState.currentState);
  const prevOnlineRef = useRef(isOnline);

  const messages = activeSession?.messages ?? localMessages;

  // ── Init: register user + create session ──────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!deviceId) {
          deviceId = generateUUID();
          await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        }

        const trade = currentUser?.trade ?? 'ELECTRICAL';

        let user = currentUser;
        if (!user) {
          const registered = await registerUser(deviceId, trade);
          user = { id: registered.id, deviceId: registered.deviceId, trade: registered.trade };
          setUser(user);
        }

        const session = await createSession(user.id, trade);
        startSession(session);
      } catch (err) {
        addLocalMessage(
          'ACT UNAVAILABLE — Stay safe. Do not proceed if unsure.',
          false
        );
      }
    }

    if (!activeSession) {
      init();
    }
  }, []);

  // ── AppState: end session on background, restore on resume ───────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (appStateRef.current === 'active' && next === 'background') {
        if (activeSession?.id) {
          await patchSession(activeSession.id, { endedAt: new Date().toISOString() }).catch(() => {});
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [activeSession]);

  // ── Reconnect sync: flush offline queue when back online ──────────────────
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline || !wasOffline || !activeSession?.id) return;

    const syncQueue = async () => {
      const queue = await loadQueue();
      if (queue.length === 0) return;

      setIsSyncing(true);
      for (const item of queue) {
        try {
          const response = await apiSendMessage(item.sessionId, item.message);
          const aiMsg: Message = {
            id: `local_sync_${Date.now()}`,
            sessionId: item.sessionId,
            role: 'ASSISTANT',
            content: response.message,
            isSafetyAlert: response.isSafetyAlert,
            createdAt: new Date().toISOString(),
          };
          addMessage(aiMsg);
          await removeFromQueue(item.id);
        } catch {
          // Leave in queue for next reconnect
        }
      }
      setIsSyncing(false);
    };

    syncQueue();
  }, [isOnline, activeSession?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function addLocalMessage(content: string, isSafetyAlert: boolean, role: 'USER' | 'ASSISTANT' = 'ASSISTANT') {
    const msg: Message = {
      id: `local_${Date.now()}`,
      sessionId: activeSession?.id ?? 'local',
      role,
      content,
      isSafetyAlert,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, msg]);
    return msg;
  }

  function triggerSafetyFlash() {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  // ── Camera Capture ────────────────────────────────────────────────────────

  const handleCapture = useCallback(async (result: CaptureResult) => {
    const captureMsg: Message = {
      id: `local_cap_${Date.now()}`,
      sessionId: activeSession?.id ?? 'local',
      role: 'USER',
      content: '📷 [Frame captured — ACT analyzing...]',
      isSafetyAlert: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(captureMsg);
    setIsTyping(true);

    try {
      const sessionId = activeSession?.id;
      if (!sessionId) throw new Error('No active session');

      const response = await apiSendMessage(sessionId, 'Analyze this.', result.base64);

      const aiMsg: Message = {
        id: `local_a_${Date.now()}`,
        sessionId,
        role: 'ASSISTANT',
        content: response.message,
        isSafetyAlert: response.isSafetyAlert,
        createdAt: new Date().toISOString(),
      };
      addMessage(aiMsg);

      if (response.isSafetyAlert) {
        triggerSafetyFlash();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      if (voiceEnabled) {
        Speech.stop();
        Speech.speak(stripEmoji(response.message), { rate: 1.0, pitch: 0.9 });
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: `local_err_${Date.now()}`,
        sessionId: activeSession?.id ?? 'local',
        role: 'ASSISTANT',
        content: 'ACT UNAVAILABLE — Stay safe. Do not proceed if unsure.',
        isSafetyAlert: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(errMsg);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [activeSession, voiceEnabled, addMessage]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (text?: string, imageBase64?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || isTyping) return;
    setInputText('');

    // Optimistic user message
    const userMsg: Message = {
      id: `local_u_${Date.now()}`,
      sessionId: activeSession?.id ?? 'local',
      role: 'USER',
      content: msg,
      isSafetyAlert: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    // ── Offline path ──────────────────────────────────────────────────────────
    if (!isOnline) {
      const cached = matchOfflineQuery(msg, currentUser?.trade ?? 'ELECTRICAL');
      const aiMsg: Message = {
        id: `local_offline_${Date.now()}`,
        sessionId: activeSession?.id ?? 'local',
        role: 'ASSISTANT',
        content: cached ?? 'No cached answer. Reconnect for full ACT guidance.',
        isSafetyAlert: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(aiMsg);

      if (!cached && activeSession?.id) {
        await enqueueMessage(activeSession.id, msg);
      }

      if (activeSession?.id) {
        const snapshot = [...(activeSession.messages ?? []), userMsg, aiMsg];
        await backupSessionMessages(activeSession.id, snapshot.map((m) => ({
          id: m.id, role: m.role, content: m.content,
          isSafetyAlert: m.isSafetyAlert, createdAt: m.createdAt,
        })));
      }

      if (voiceEnabled && cached) {
        Speech.stop();
        Speech.speak(stripEmoji(cached), { rate: 1.0, pitch: 0.9 });
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────────
    setIsTyping(true);

    try {
      const sessionId = activeSession?.id;
      if (!sessionId) throw new Error('No active session');

      const response = await apiSendMessage(sessionId, msg, imageBase64);

      const aiMsg: Message = {
        id: `local_a_${Date.now()}`,
        sessionId,
        role: 'ASSISTANT',
        content: response.message,
        isSafetyAlert: response.isSafetyAlert,
        createdAt: new Date().toISOString(),
      };
      addMessage(aiMsg);

      const snapshot = [...(activeSession.messages ?? []), userMsg, aiMsg];
      await backupSessionMessages(sessionId, snapshot.map((m) => ({
        id: m.id, role: m.role, content: m.content,
        isSafetyAlert: m.isSafetyAlert, createdAt: m.createdAt,
      })));

      if (response.isSafetyAlert) {
        triggerSafetyFlash();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (voiceEnabled) {
        Speech.stop();
        Speech.speak(stripEmoji(response.message), { rate: 1.0, pitch: 0.9 });
      }

    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const errMsg: Message = {
        id: `local_err_${Date.now()}`,
        sessionId: activeSession?.id ?? 'local',
        role: 'ASSISTANT',
        content: isTimeout
          ? 'CONNECTION LOST — check signal.'
          : 'ACT UNAVAILABLE — Stay safe. Do not proceed if unsure.',
        isSafetyAlert: false,
        createdAt: new Date().toISOString(),
      };
      addMessage(errMsg);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, isTyping, activeSession, voiceEnabled, addMessage, isOnline]);

  const handleSimCapture = useCallback(() => {
    handleSend('Describe what I should look for when inspecting this type of electrical work.');
  }, [handleSend]);

  // ── Voice transcript handler ──────────────────────────────────────────────

  const handleTranscript = useCallback((text: string) => {
    if (!text || text.length < 3) {
      // Hands-free: re-arm immediately on empty transcript
      if (handsFreeMode) setHandsFreeListening(false);
      return;
    }

    if (handsFreeMode) {
      // Auto-send in hands-free mode; re-arm mic after ACT responds
      setHandsFreeListening(false);
      handleSend(text).then(() => {
        setTimeout(() => setHandsFreeListening(true), 1500);
      });
    } else {
      // Manual mode: populate input, auto-send after 1s (cancellable by editing)
      setInputText(text);
      const timer = setTimeout(() => {
        setInputText((current) => {
          if (current === text) handleSend(current);
          return current;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [handsFreeMode, handleSend]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      {/* Safety flash border */}
      <Animated.View
        style={[styles.safetyBorderOverlay, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>ACTOBER</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[styles.iconBtn, voiceEnabled && styles.iconBtnActive]}
            onPress={toggleVoice}
          >
            <Text style={styles.iconBtnText}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, cameraEnabled && styles.iconBtnActive]}
            onPress={toggleCamera}
          >
            <Text style={styles.iconBtnText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, handsFreeMode && styles.iconBtnActive]}
            onPress={toggleHandsFree}
          >
            <Text style={styles.iconBtnText}>🎧</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline / Syncing Banner */}
      <OfflineBanner isOnline={isOnline} isSyncing={isSyncing} />

      {/* Camera Viewfinder */}
      {cameraEnabled && (
        Platform.OS === 'ios' || Platform.OS === 'android'
          ? <ActoberCamera
              trade={currentUser?.trade ?? 'ELECTRICAL'}
              onCapture={handleCapture}
              onError={(msg) => addMessage({
                id: `local_err_${Date.now()}`,
                sessionId: activeSession?.id ?? 'local',
                role: 'ASSISTANT',
                content: msg,
                isSafetyAlert: false,
                createdAt: new Date().toISOString(),
              })}
            />
          : <CameraStandby
              trade={currentUser?.trade ?? 'ELECTRICAL'}
              onSimCapture={handleSimCapture}
            />
      )}

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && !isTyping && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>ACT IS READY</Text>
              <Text style={styles.emptySubtitle}>
                Describe what you're working on or tap a chip below.
              </Text>
            </View>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Quick Chips — trade-specific */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {QUICK_CHIPS_BY_TRADE[currentUser?.trade ?? 'ELECTRICAL'].map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => handleSend(chip.message)}
              disabled={isTyping}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input Row */}
        <View style={[styles.inputRow, handsFreeMode && styles.inputRowHandsFree]}>
          <VoiceInput
            onTranscript={handleTranscript}
            disabled={isTyping}
            handsFreeMode={handsFreeMode && handsFreeListening}
          />
          {!handsFreeMode && (
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask ACT anything..."
              placeholderTextColor={Colors.textMuted}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
            />
          )}
          {handsFreeMode && (
            <View style={styles.handsFreeLabel}>
              <Text style={styles.handsFreeLabelText}>
                {isTyping ? 'ACT RESPONDING...' : handsFreeListening ? '● LISTENING' : 'HOLD MIC TO SPEAK'}
              </Text>
            </View>
          )}
          {!handsFreeMode && (
            <TouchableOpacity
              style={[styles.sendBtn, inputText.trim() ? styles.sendBtnActive : null]}
              onPress={() => handleSend()}
              disabled={isTyping || !inputText.trim()}
            >
              <Text style={styles.sendText}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  safetyBorderOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 4,
    borderColor: Colors.danger,
    zIndex: 999,
  } as any,
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontFamily: 'Courier New',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 3,
  },
  topBarActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  iconBtnActive: { borderColor: Colors.primary, backgroundColor: '#1A0E06' },
  iconBtnText: { fontSize: 16 },
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 10, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: 'Courier New', fontSize: 14, color: Colors.primary, letterSpacing: 2, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  bubble: { maxWidth: '80%', borderRadius: 10, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.userBubble },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: Colors.aiBubble,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  actLabel: { fontFamily: 'Courier New', fontSize: 10, color: Colors.primary, letterSpacing: 1, marginBottom: 4 },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  userBubbleText: { color: '#C8D8F0' },
  safetyBubble: {
    alignSelf: 'flex-start', maxWidth: '90%',
    backgroundColor: Colors.dangerDim, borderWidth: 1, borderColor: Colors.danger,
    borderRadius: 10, padding: 12,
  },
  safetyLabel: { fontFamily: 'Courier New', fontSize: 10, color: Colors.danger, letterSpacing: 1, marginBottom: 4 },
  safetyText: { fontSize: 14, color: '#FCA5A5', lineHeight: 20 },
  typingContainer: {
    alignSelf: 'flex-start', backgroundColor: Colors.aiBubble,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
    borderRadius: 10, padding: 12,
  },
  typingDots: { flexDirection: 'row', gap: 5, marginTop: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  chipsRow: { maxHeight: 44 },
  chipsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipText: { fontFamily: 'Courier New', fontSize: 12, color: Colors.text },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputRowHandsFree: {
    justifyContent: 'center',
    paddingVertical: 16,
  },
  handsFreeLabel: {
    flex: 1,
    alignItems: 'center',
  },
  handsFreeLabelText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  input: {
    flex: 1, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.text, fontSize: 14, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: Colors.primary },
  sendText: { fontSize: 18, color: Colors.text },
});

// ── UUID helper ───────────────────────────────────────────────────────────────
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
