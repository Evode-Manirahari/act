import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Pressable, Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../theme/colors';
import { useActStore } from '../store/act';
import { api, streamChat } from '../api/act';
import type { HomeStackParamList } from '../navigation/RootNavigator';
import CompletionModal from '../components/CompletionModal';
import { useVoice } from '../hooks/useVoice';
import { useStreak } from '../hooks/useStreak';
import { useVoiceInput } from '../hooks/useVoiceInput';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Project'>;
type RoutePropType = RouteProp<HomeStackParamList, 'Project'>;

const SESSION_ID_KEY = 'actober_active_session_id';

const CATEGORY_COLORS: Record<string, string> = {
  MAKE: colors.make, IMPROVE: colors.improve,
  GROW: colors.grow, CREATE: colors.create,
};

export default function ProjectScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' } | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const streamingIdRef = useRef<string | null>(null);

  const {
    session, activeProject, setActiveProject, upsertProject,
    messages, addMessage, appendToMessage, replaceMessage, isTyping, setIsTyping, setPhase, clearSession,
  } = useActStore();

  const { voiceEnabled, speak } = useVoice();
  const { recordCompletion } = useStreak();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceInput();
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const project = activeProject;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  if (!project) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No active project.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[project.category] ?? colors.primary;
  const completedSteps = project.steps.filter(s => s.completed).length;
  const progress = project.steps.length > 0 ? completedSteps / project.steps.length : 0;
  const allDone = completedSteps === project.steps.length && project.steps.length > 0;

  async function markStepDone(stepIndex: number) {
    try {
      const updated = await api.updateProject(project!.id, {
        stepCompleted: stepIndex,
        currentStepIndex: Math.min(stepIndex + 1, project!.steps.length - 1),
      });
      setActiveProject(updated);
      upsertProject(updated);

      // Speak the next step if voice is on
      const nextStep = updated.steps[stepIndex + 1];
      if (voiceEnabled && nextStep) {
        speak(`Step ${stepIndex + 2}: ${nextStep.title}. ${nextStep.description}`);
      }
    } catch {}
  }

  async function handleComplete() {
    try {
      const updated = await api.updateProject(project!.id, { status: 'COMPLETED' });
      setActiveProject(updated);
      upsertProject(updated);
      setPhase('COMPLETE');
      await recordCompletion();
      if (voiceEnabled) speak(`Done. You made ${project!.title}. That's real progress.`);
      setShowCompletion(true);
    } catch {}
  }

  async function handleAbandon() {
    try {
      const updated = await api.updateProject(project!.id, { status: 'ABANDONED' });
      setActiveProject(null);
      upsertProject(updated);
      clearSession();
      await AsyncStorage.removeItem(SESSION_ID_KEY);
      navigation.popToTop();
    } catch {}
    setShowAbandonConfirm(false);
  }

  async function handleStartAnother() {
    setShowCompletion(false);
    clearSession();
    await AsyncStorage.removeItem(SESSION_ID_KEY);
    navigation.popToTop();
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (result.canceled || !result.assets[0]) return;
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manipulated.base64) return;
    setPendingImage({ uri: manipulated.uri, base64: manipulated.base64, mimeType: 'image/jpeg' });
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: false });
    if (result.canceled || !result.assets[0]) return;
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manipulated.base64) return;
    setPendingImage({ uri: manipulated.uri, base64: manipulated.base64, mimeType: 'image/jpeg' });
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && !pendingImage) || !session || isTyping) return;
    const image = pendingImage;
    setInput('');
    setPendingImage(null);
    Keyboard.dismiss();
    setIsTyping(true);

    addMessage({
      id: Date.now().toString(),
      sessionId: session.id,
      role: 'USER',
      content: image ? `📷 ${text || 'What do you see?'}` : text,
      createdAt: new Date().toISOString(),
    });

    const streamId = `stream_${Date.now()}`;
    streamingIdRef.current = streamId;
    addMessage({ id: streamId, sessionId: session.id, role: 'ASSISTANT', content: '', createdAt: new Date().toISOString() });

    try {
      const response = await streamChat(
        session.id,
        text || 'What do you see?',
        {
          imageBase64: image?.base64,
          imageMimeType: image?.mimeType,
          onDelta: (delta) => appendToMessage(streamId, delta),
        }
      );
      replaceMessage(streamId, response.message);
      if (response.project) {
        setActiveProject(response.project);
        upsertProject(response.project);
      }
      if (voiceEnabled) speak(response.message.content);
    } catch {
      replaceMessage(streamId, {
        id: streamId,
        sessionId: session.id,
        role: 'ASSISTANT',
        content: 'Connection issue. Try again.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
      streamingIdRef.current = null;
    }
  }

  // Show last 6 ACT messages for context
  const coachingMessages = messages.filter(m => m.role === 'ASSISTANT').slice(-6);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Today</Text>
        </TouchableOpacity>
        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
        {project.status === 'IN_PROGRESS' && (
          <TouchableOpacity onPress={() => setShowAbandonConfirm(true)} style={styles.abandonBtn}>
            <Text style={styles.abandonBtnText}>Quit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Abandon confirm */}
      {showAbandonConfirm && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>Give up on this one?</Text>
          <TouchableOpacity style={styles.confirmYes} onPress={handleAbandon}>
            <Text style={styles.confirmYesText}>Yes, quit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmNo} onPress={() => setShowAbandonConfirm(false)}>
            <Text style={styles.confirmNoText}>Keep going</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{completedSteps} of {project.steps.length} steps</Text>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[
            styles.progressBarFill,
            { width: `${progress * 100}%` as any, backgroundColor: categoryColor },
          ]} />
        </View>

        {/* Steps */}
        <Text style={styles.sectionLabel}>Steps</Text>
        {project.steps.map((step, i) => (
          <View key={step.id} style={[styles.step, step.completed && styles.stepDone]}>
            <View style={styles.stepLeft}>
              <TouchableOpacity
                style={[styles.stepCheck, step.completed && { backgroundColor: colors.success, borderColor: colors.success }]}
                onPress={() => !step.completed && markStepDone(i)}
                disabled={step.completed}
              >
                {step.completed && <Text style={styles.checkMark}>✓</Text>}
                {!step.completed && i === project.currentStepIndex && (
                  <View style={[styles.activeDot, { backgroundColor: categoryColor }]} />
                )}
              </TouchableOpacity>
              {i < project.steps.length - 1 && (
                <View style={[styles.stepLine, step.completed && { backgroundColor: colors.success }]} />
              )}
            </View>
            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, step.completed && styles.stepTitleDone]}>
                {i + 1}. {step.title}
              </Text>
              {!step.completed && i === project.currentStepIndex && (
                <Text style={styles.stepDesc}>{step.description}</Text>
              )}
            </View>
          </View>
        ))}

        {/* Complete button */}
        {allDone && project.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: colors.success }]}
            onPress={handleComplete}
          >
            <Text style={styles.completeBtnText}>Mark Complete ✓</Text>
          </TouchableOpacity>
        )}

        {project.status === 'COMPLETED' && (
          <TouchableOpacity
            style={styles.completedBanner}
            onPress={() => setShowCompletion(true)}
          >
            <Text style={styles.completedBannerText}>Done. You made something real today. 🎉</Text>
          </TouchableOpacity>
        )}

        {/* ACT coaching */}
        {coachingMessages.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>ACT</Text>
            {coachingMessages.map(msg => (
              <View key={msg.id} style={styles.actMessage}>
                <Text style={styles.actMessageText}>{msg.content}</Text>
              </View>
            ))}
          </>
        )}

        {isTyping && (
          <View style={styles.actMessage}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}
      </ScrollView>

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
        <TouchableOpacity style={styles.cameraBtn} onPress={handlePickImage} disabled={isTyping}>
          <Text style={styles.cameraBtnText}>🖼</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={pendingImage ? 'Add a note... (or just send)' : 'Ask ACT anything...'}
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        {/* Mic — press and hold to record */}
        <Pressable
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPressIn={() => !isTyping && startRecording()}
          onPressOut={async () => {
            const text = await stopRecording();
            if (text) setInput((prev) => prev ? `${prev} ${text}` : text);
          }}
          onLongPress={() => {}}
          disabled={isTyping}
        >
          {isTranscribing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎙'}</Text>
          }
        </Pressable>

        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: categoryColor }, ((!input.trim() && !pendingImage) || isTyping) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={(!input.trim() && !pendingImage) || isTyping}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Completion modal */}
      {project.status === 'COMPLETED' && (
        <CompletionModal
          project={project}
          visible={showCompletion}
          onStartAnother={handleStartAnother}
          onDismiss={() => setShowCompletion(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted },
  backLink: { fontSize: 14, color: colors.primary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface, gap: 8,
  },
  backBtn: { marginRight: 4 },
  backBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  abandonBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  abandonBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  confirmBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFF7ED', borderBottomWidth: 1, borderBottomColor: '#FED7AA',
  },
  confirmText: { flex: 1, fontSize: 13, color: colors.text },
  confirmYes: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.error + '18', borderRadius: 20,
  },
  confirmYesText: { fontSize: 12, fontWeight: '700', color: colors.error },
  confirmNo: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.success + '18', borderRadius: 20,
  },
  confirmNoText: { fontSize: 12, fontWeight: '700', color: colors.success },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 32 },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, color: colors.textMuted },
  progressPct: { fontSize: 13, fontWeight: '700', color: colors.text },
  progressBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
  progressBarFill: { height: 6, borderRadius: 3 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 6,
  },

  step: { flexDirection: 'row', gap: 12, paddingBottom: 2 },
  stepDone: { opacity: 0.55 },
  stepLeft: { alignItems: 'center', width: 26 },
  stepCheck: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 12, color: '#fff', fontWeight: '700' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4, minHeight: 18 },
  stepBody: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  stepTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  stepDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 4 },

  completeBtn: {
    padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  completedBanner: {
    backgroundColor: colors.successLight, borderRadius: 12, padding: 16, marginTop: 8,
  },
  completedBannerText: {
    fontSize: 15, fontWeight: '600', color: colors.success, textAlign: 'center',
  },

  actMessage: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  actMessageText: { fontSize: 14, color: colors.text, lineHeight: 20 },

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
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  micBtnActive: { backgroundColor: colors.error, borderColor: colors.error },
  micBtnText: { fontSize: 20 },
});
