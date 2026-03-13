import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useActoberStore } from '../store/actober';
import { Colors } from '../theme/colors';
import { Message } from '@actober/shared-types';
import { getSessionSummary, exportSessionPdf } from '../api/actober';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SessionDetail'>;
  route: RouteProp<RootStackParamList, 'SessionDetail'>;
};

function ReadOnlyMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'USER';
  return (
    <View style={[
      styles.bubble,
      isUser ? styles.userBubble : styles.aiBubble,
      msg.isSafetyAlert && styles.safetyBubble,
    ]}>
      {!isUser && <Text style={styles.actLabel}>ACT</Text>}
      <Text style={[styles.bubbleText, isUser && styles.userText]}>{msg.content}</Text>
    </View>
  );
}

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { sessions } = useActoberStore();
  const session = sessions.find((s) => s.id === route.params.sessionId);
  const [notes, setNotes] = useState(session?.jobNotes ?? '');
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(session?.summary ?? null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Fetch summary on mount
  useEffect(() => {
    if (!session?.id || summary) return;
    setSummaryLoading(true);
    getSessionSummary(session.id)
      .then((data) => setSummary(data.summary))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [session?.id]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const pdfBuffer = await exportSessionPdf(session.id);

      // Convert ArrayBuffer → base64 → write to device
      const uint8 = new Uint8Array(pdfBuffer);
      const binary = uint8.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
      const base64 = btoa(binary);

      const fileName = `actober-job-${session.id.slice(0, 8)}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Actober Job Report',
        });
      } else {
        Alert.alert('Saved', `Report saved to: ${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message ?? 'Could not generate PDF. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const messages = session.messages ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.exportText}>{isExporting ? 'GENERATING...' : 'EXPORT PDF'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Session Meta */}
        <View style={styles.meta}>
          <Text style={styles.metaTrade}>{session.trade}</Text>
          <Text style={styles.metaAddress}>{session.jobAddress || 'No address'}</Text>
          <Text style={styles.metaDate}>
            {new Date(session.startedAt).toLocaleString()}
          </Text>
        </View>

        {/* AI Summary */}
        {summaryLoading && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>AI SUMMARY</Text>
            <Text style={styles.summaryLoading}>Generating summary...</Text>
          </View>
        )}
        {!summaryLoading && summary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>AI SUMMARY</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Job Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionLabel}>JOB NOTES</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add job notes..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Message History */}
        <Text style={styles.sectionLabel}>CONVERSATION ({messages.length})</Text>
        <View style={styles.messageList}>
          {messages.map((msg) => (
            <ReadOnlyMessage key={msg.id} msg={msg} />
          ))}
          {messages.length === 0 && (
            <Text style={styles.noMessages}>No messages in this session.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: Colors.primary },
  exportBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnDisabled: { backgroundColor: Colors.primaryDim, opacity: 0.6 },
  exportText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  meta: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 16,
  },
  metaTrade: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  metaAddress: { fontSize: 15, color: Colors.text, fontWeight: '600', marginBottom: 4 },
  metaDate: { fontSize: 12, color: Colors.textMuted },
  summaryBox: {
    backgroundColor: '#0F1A0F',
    borderWidth: 1,
    borderColor: Colors.safe,
    borderRadius: 10,
    padding: 16,
  },
  summaryLabel: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.safe,
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  summaryLoading: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  notesSection: {},
  sectionLabel: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  messageList: { gap: 10 },
  bubble: { borderRadius: 10, padding: 12 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.userBubble,
    maxWidth: '80%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.aiBubble,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    maxWidth: '85%',
  },
  safetyBubble: {
    backgroundColor: Colors.dangerDim,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderLeftWidth: 1,
  },
  actLabel: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  userText: { color: '#C8D8F0' },
  noMessages: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: Colors.textMuted, fontSize: 14 },
});
