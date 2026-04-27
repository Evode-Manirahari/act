import React, { useState } from 'react';
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
import { demoTurn } from '../api/actApi';

export default function AskActScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera permission needed', 'Enable camera access in Settings to use ACT.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    setPhotoUri(result.assets[0].uri);
    setAnswer(null);
    setError(null);
  }

  async function handleAsk() {
    if (!photoUri || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await demoTurn(photoUri, question.trim());
      setAnswer(result.answer);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhotoUri(null);
    setQuestion('');
    setAnswer(null);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>ACT</Text>
        <Text style={styles.subtitle}>Point at wiring, panels, or devices. Ask what to verify next.</Text>

        {!photoUri ? (
          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto} activeOpacity={0.85}>
            <Text style={styles.captureBtnIcon}>📷</Text>
            <Text style={styles.captureBtnText}>Take a photo</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            <TouchableOpacity style={styles.linkBtn} onPress={takePhoto}>
              <Text style={styles.linkText}>Retake</Text>
            </TouchableOpacity>
          </>
        )}

        {photoUri && !answer && (
          <>
            <TextInput
              style={styles.input}
              placeholder="What's your question? e.g. 'what era is this panel and is it safe to touch?'"
              placeholderTextColor={colors.textLight}
              value={question}
              onChangeText={setQuestion}
              multiline
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.askBtn, (loading || !question.trim()) && styles.askBtnDisabled]}
              onPress={handleAsk}
              disabled={loading || !question.trim()}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.askBtnText}>Ask ACT</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {answer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>ACT</Text>
            <Text style={styles.answerText}>{answer}</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={reset}>
              <Text style={styles.linkText}>Ask again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16 },
  title: { fontSize: 40, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 8 },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  captureBtnIcon: { fontSize: 36 },
  captureBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
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
  answerBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 12,
  },
  answerLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.5 },
  answerText: { fontSize: 16, color: colors.text, lineHeight: 24 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12 },
  errorText: { color: colors.error, fontSize: 14 },
  linkBtn: { paddingVertical: 8, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
});
