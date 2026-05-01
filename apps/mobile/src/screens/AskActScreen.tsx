import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const handleRef = useRef<StreamHandle | null>(null);

  const streaming = turns.length > 0 && turns[0].status === 'streaming';

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

  async function handleAsk() {
    if (!draftPhotoUri || !draftQuestion.trim() || streaming) return;

    const id = newId();
    const photoUri = draftPhotoUri;
    const question = draftQuestion.trim();

    setDraftPhotoUri(null);
    setDraftQuestion('');

    const turn: Turn = { id, photoUri, question, answer: '', status: 'streaming' };
    setTurns((prev) => [turn, ...prev]);

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

    handleRef.current = streamJobTurn(activeJobId, photoUri, question, {
      onToken: (chunk) =>
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, answer: t.answer + chunk } : t)),
        ),
      onHazards: (hazards) =>
        setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, hazards } : t))),
      onIntent: (intent) =>
        setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, intent } : t))),
      onTurnId: () => {
        // post-process the final answer once streaming completes
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
    });
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
  }

  function clearSession() {
    handleRef.current?.abort();
    handleRef.current = null;
    setTurns([]);
    setJobId(null);
    setDraftPhotoUri(null);
    setDraftQuestion('');
  }

  const composerHidden = streaming;

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
                <TouchableOpacity style={styles.linkBtn} onPress={takePhoto}>
                  <Text style={styles.linkText}>Retake</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="What's your question? e.g. 'what era is this panel and is it safe to touch?'"
                  placeholderTextColor={colors.textLight}
                  value={draftQuestion}
                  onChangeText={setDraftQuestion}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.askBtn, !draftQuestion.trim() && styles.askBtnDisabled]}
                  onPress={handleAsk}
                  disabled={!draftQuestion.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.askBtnText}>Ask ACT</Text>
                </TouchableOpacity>
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
});
