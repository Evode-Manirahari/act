import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { askLibrary, type LibraryAskResponse } from '../api/libraryApi';
import { getDemoContext } from '../api/captureApi';
import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  accountId?: string | null;
};

export default function ActAskPanel({ visible, onClose, accountId }: Props) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<LibraryAskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      let scopedAccountId = accountId ?? null;
      if (!scopedAccountId) {
        try {
          scopedAccountId = (await getDemoContext()).account_id;
        } catch {
          scopedAccountId = null;
        }
      }
      setAnswer(await askLibrary({
        query: trimmed,
        trade: 'hvac',
        accountId: scopedAccountId ?? undefined,
        limit: 3,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask ACT failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Ask ACT</Text>
              <Text style={styles.title}>Reviewed cards only</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            Ask about published training cards, past jobs, callback patterns, or pilot
            metrics. ACT will not give live job instructions.
          </Text>

          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            multiline
            placeholder="Ask about a reviewed card or callback pattern"
            placeholderTextColor={colors.textLight}
          />

          <Pressable
            accessibilityRole="button"
            disabled={loading || query.trim().length === 0}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.askButton,
              (loading || query.trim().length === 0) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.askButtonText}>Ask published library</Text>
            )}
          </Pressable>

          {error ? (
            <View style={[styles.result, styles.errorResult]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {answer ? (
            <View style={[styles.result, answer.refusal_reason && styles.refusalResult]}>
              <Text style={styles.answerText}>{answer.answer}</Text>
              {answer.citations.length > 0 ? (
                <View style={styles.citations}>
                  <Text style={styles.citationLabel}>Sources</Text>
                  {answer.citations.map((citation) => (
                    <Text key={citation.card_id} style={styles.citationText}>
                      {citation.title}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,24,31,0.42)',
  },
  panel: {
    maxHeight: '88%',
    padding: 18,
    gap: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: { ...labelStyle, color: colors.primary, fontSize: 11 },
  title: { color: colors.ink, fontSize: 20, fontFamily: fonts.display },
  close: { color: colors.steel500, fontSize: 14, fontFamily: fonts.semibold },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: fonts.body },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    padding: 12,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.body,
    textAlignVertical: 'top',
  },
  askButton: {
    minHeight: 50,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: fonts.bold },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  result: {
    gap: 10,
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  refusalResult: {
    borderColor: colors.caution,
    backgroundColor: colors.cautionLight,
  },
  errorResult: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  answerText: { color: colors.steel700, fontSize: 14, lineHeight: 21, fontFamily: fonts.body },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 19, fontFamily: fonts.semibold },
  citations: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  citationLabel: { ...labelStyle, color: colors.steel500, fontSize: 10 },
  citationText: { color: colors.text, fontSize: 13, fontFamily: fonts.semibold },
});
