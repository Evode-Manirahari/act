import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import {
  createDemoSession,
  extractNeedsPhotoHint,
  Hazard,
  Intent,
  streamJobTurn,
  StreamHandle,
} from '../api/actApi';

type TurnStatus = 'streaming' | 'done' | 'error';

interface Turn {
  id: string;
  photoUri: string;
  question: string;
  answer: string;
  status: TurnStatus;
  error?: string;
  hazards?: Hazard[];
  intent?: Intent;
  needsPhotoHint?: string | null;
  audioUrl?: string;
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const SEVERITY_COLOR: Record<Hazard['severity'], string> = {
  critical: '#DC2626',
  elevated: '#F97316',
  watch: '#CA8A04',
};

const SEVERITY_LABEL: Record<Hazard['severity'], string> = {
  critical: 'CRITICAL HAZARD',
  elevated: 'ELEVATED HAZARD',
  watch: 'WATCH',
};

export default function AskActScreen() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [useTyping, setUseTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const handleRef = useRef<StreamHandle | null>(null);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackRef = useRef<Audio.Sound | null>(null);

  const streaming = turns.length > 0 && turns[0].status === 'streaming';

  useEffect(() => {
    Audio.requestPermissionsAsync().catch(() => {});
    return () => {
      playbackRef.current?.unloadAsync().catch(() => {});
      recordingTimerRef.current && clearInterval(recordingTimerRef.current);
    };
  }, []);

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera permission needed', 'Enable camera access in Settings to use ACT.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    setDraftPhotoUri(result.assets[0].uri);
  }

  async function ensureSession(): Promise<string> {
    if (jobId) return jobId;
    const session = await createDemoSession();
    setJobId(session.job_id);
    return session.job_id;
  }

  async function playAudio(url: string) {
    if (!url || url.startsWith('stub://') || url.startsWith('local://')) return;
    try {
      if (playbackRef.current) {
        await playbackRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      playbackRef.current = sound;
    } catch (e) {
      // playback failure is non-fatal — text answer is already on screen
    }
  }

  async function startRecording() {
    if (recordingRef.current || isRecording) return;
    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Microphone permission needed', 'Enable mic access in Settings → Apps → Expo Go.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      recordingStartRef.current = Date.now();
      setRecordingMs(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - recordingStartRef.current);
      }, 100);
    } catch (e: any) {
      Alert.alert('Mic error', e?.message ?? 'Could not start recording');
    }
  }

  async function stopRecordingAndSend() {
    const rec = recordingRef.current;
    if (!rec) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    let uri: string | null = null;
    try {
      await rec.stopAndUnloadAsync();
      uri = rec.getURI();
    } catch (e) {
      // ignore
    }
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingMs(0);

    if (!uri) {
      Alert.alert('No audio captured', 'Try again — make sure you spoke before tapping send.');
      return;
    }
    if (!draftPhotoUri) {
      Alert.alert('No photo', 'Take a photo first, then record.');
      return;
    }

    sendTurn({ photoUri: draftPhotoUri, audioUri: uri });
    setDraftPhotoUri(null);
  }

  async function cancelRecording() {
    const rec = recordingRef.current;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
      } catch {}
    }
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingMs(0);
  }

  function handleAskTyped() {
    if (!draftPhotoUri || !draftQuestion.trim() || streaming) return;
    const photoUri = draftPhotoUri;
    const question = draftQuestion.trim();
    setDraftPhotoUri(null);
    setDraftQuestion('');
    sendTurn({ photoUri, question });
  }

  function sendTurn(args: { photoUri: string; question?: string; audioUri?: string }) {
    const id = newId();
    const turn: Turn = {
      id,
      photoUri: args.photoUri,
      question: args.question ?? '🎤 (recording…)',
      answer: '',
      status: 'streaming',
    };
    setTurns((prev) => [turn, ...prev]);

    (async () => {
      let activeJobId: string;
      try {
        activeJobId = await ensureSession();
      } catch (e: any) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status: 'error' as const, error: `Couldn't start session: ${e?.message ?? 'unknown'}` }
              : t,
          ),
        );
        return;
      }

      handleRef.current = streamJobTurn(
        activeJobId,
        { photoUri: args.photoUri, question: args.question, audioUri: args.audioUri },
        {
          onTranscript: (text) =>
            setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, question: text } : t))),
          onToken: (chunk) =>
            setTurns((prev) =>
              prev.map((t) => (t.id === id ? { ...t, answer: t.answer + chunk } : t)),
            ),
          onHazards: (hazards) =>
            setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, hazards } : t))),
          onIntent: (intent) =>
            setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, intent } : t))),
          onAudio: (url) => {
            setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, audioUrl: url } : t)));
            playAudio(url);
          },
          onTurnId: () => {
            setTurns((prev) =>
              prev.map((t) => {
                if (t.id !== id) return t;
                const { cleaned, hint } = extractNeedsPhotoHint(t.answer);
                return { ...t, answer: cleaned, needsPhotoHint: hint };
              }),
            );
          },
          onDone: () =>
            setTurns((prev) =>
              prev.map((t) => (t.id === id ? { ...t, status: 'done' as const } : t)),
            ),
          onError: (msg) =>
            setTurns((prev) =>
              prev.map((t) => (t.id === id ? { ...t, status: 'error' as const, error: msg } : t)),
            ),
        },
      );
    })();
  }

  async function followUpFromHint(hint: string) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera permission needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    setDraftPhotoUri(result.assets[0].uri);
    setDraftQuestion(`Follow-up: ${hint}`);
    setUseTyping(true);
  }

  function clearSession() {
    handleRef.current?.abort();
    handleRef.current = null;
    playbackRef.current?.unloadAsync().catch(() => {});
    playbackRef.current = null;
    setTurns([]);
    setJobId(null);
    setDraftPhotoUri(null);
    setDraftQuestion('');
    setUseTyping(false);
  }

  const composerHidden = streaming;
  const recordingSeconds = (recordingMs / 1000).toFixed(1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>ACT</Text>
          {turns.length > 0 && (
            <TouchableOpacity onPress={clearSession} hitSlop={8}>
              <Text style={styles.clearLink}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          Point at wiring, panels, or devices. Ask what to verify next.
        </Text>

        {!composerHidden && (
          <View style={styles.composer}>
            {!draftPhotoUri ? (
              <TouchableOpacity style={styles.captureBtn} onPress={takePhoto} activeOpacity={0.85}>
                <Text style={styles.captureBtnIcon}>📷</Text>
                <Text style={styles.captureBtnText}>
                  {turns.length === 0 ? 'Take a photo' : 'Ask another question'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Image source={{ uri: draftPhotoUri }} style={styles.preview} />
                <TouchableOpacity style={styles.linkBtn} onPress={takePhoto} disabled={isRecording}>
                  <Text style={[styles.linkText, isRecording && styles.linkTextDisabled]}>Retake</Text>
                </TouchableOpacity>

                {!useTyping ? (
                  <>
                    {!isRecording ? (
                      <TouchableOpacity
                        style={styles.talkBtn}
                        onPress={startRecording}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.talkBtnIcon}>🎤</Text>
                        <Text style={styles.talkBtnText}>Tap to talk</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <View style={styles.recordingBanner}>
                          <View style={styles.recDot} />
                          <Text style={styles.recordingText}>Listening — {recordingSeconds}s</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.sendBtn}
                          onPress={stopRecordingAndSend}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.sendBtnText}>Send →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cancelRecording} style={styles.linkBtn} hitSlop={8}>
                          <Text style={styles.linkText}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {!isRecording && (
                      <TouchableOpacity
                        onPress={() => setUseTyping(true)}
                        style={styles.linkBtn}
                        hitSlop={8}
                      >
                        <Text style={styles.linkText}>or type instead</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="What's your question? e.g. 'what era is this panel?'"
                      placeholderTextColor={colors.textLight}
                      value={draftQuestion}
                      onChangeText={setDraftQuestion}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.askBtn, !draftQuestion.trim() && styles.askBtnDisabled]}
                      onPress={handleAskTyped}
                      disabled={!draftQuestion.trim()}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.askBtnText}>Ask ACT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setUseTyping(false)}
                      style={styles.linkBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.linkText}>back to voice</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {turns.map((turn) => (
          <View key={turn.id} style={styles.turnCard}>
            <View style={styles.turnHeader}>
              <Image source={{ uri: turn.photoUri }} style={styles.turnThumb} />
              <Text style={styles.turnQuestion} numberOfLines={4}>
                {turn.question}
              </Text>
            </View>

            <View style={styles.turnAnswerWrap}>
              <View style={styles.answerHeader}>
                <Text style={styles.answerLabel}>ACT</Text>
                {turn.status === 'streaming' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              {turn.status === 'error' ? (
                <Text style={styles.errorText}>{turn.error ?? 'Something went wrong'}</Text>
              ) : turn.answer.length > 0 ? (
                <Text style={styles.answerText}>{turn.answer}</Text>
              ) : (
                <Text style={styles.answerPlaceholder}>Looking…</Text>
              )}
            </View>

            {turn.hazards?.map((h, i) => (
              <View
                key={i}
                style={[styles.hazardBox, { borderLeftColor: SEVERITY_COLOR[h.severity] }]}
              >
                <Text style={[styles.hazardLabel, { color: SEVERITY_COLOR[h.severity] }]}>
                  ⚠ {SEVERITY_LABEL[h.severity]} — {h.brand}
                </Text>
                <Text style={styles.hazardText}>{h.issue}</Text>
                <Text style={styles.hazardMeta}>Era: {h.year_range}</Text>
                <Text style={styles.hazardAction}>{h.action}</Text>
              </View>
            ))}

            {turn.needsPhotoHint && (
              <TouchableOpacity
                style={styles.needsPhotoBox}
                onPress={() => followUpFromHint(turn.needsPhotoHint!)}
                activeOpacity={0.85}
              >
                <Text style={styles.needsPhotoLabel}>📷 ACT wants a closer shot</Text>
                <Text style={styles.needsPhotoText}>{turn.needsPhotoHint}</Text>
                <Text style={styles.needsPhotoCta}>Tap to take it →</Text>
              </TouchableOpacity>
            )}

            {turn.audioUrl && !turn.audioUrl.startsWith('stub://') && !turn.audioUrl.startsWith('local://') && (
              <TouchableOpacity onPress={() => playAudio(turn.audioUrl!)} style={styles.replayBtn}>
                <Text style={styles.replayText}>🔊 Replay</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 40, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  clearLink: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 8 },

  composer: { gap: 12 },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  captureBtnIcon: { fontSize: 36 },
  captureBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  askBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  askBtnDisabled: { opacity: 0.4 },
  askBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  talkBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 28,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
  },
  talkBtnIcon: { fontSize: 36 },
  talkBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sendBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkTextDisabled: { opacity: 0.4 },

  recordingBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#DC2626' },
  recordingText: { color: '#991B1B', fontSize: 15, fontWeight: '700', flex: 1 },

  turnCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  turnHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  turnThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  turnQuestion: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  turnAnswerWrap: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    gap: 8,
  },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.5 },
  answerText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  answerPlaceholder: { fontSize: 15, color: colors.textMuted, fontStyle: 'italic' },
  errorText: { color: colors.error, fontSize: 14 },
  linkBtn: { paddingVertical: 6, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '500' },

  hazardBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    gap: 4,
  },
  hazardLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  hazardText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  hazardMeta: { fontSize: 12, color: colors.textMuted },
  hazardAction: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 4 },

  needsPhotoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  needsPhotoLabel: { fontSize: 12, fontWeight: '700', color: '#92400E', letterSpacing: 0.5 },
  needsPhotoText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  needsPhotoCta: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 4 },

  replayBtn: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  replayText: { fontSize: 13, color: colors.text, fontWeight: '600' },
});
