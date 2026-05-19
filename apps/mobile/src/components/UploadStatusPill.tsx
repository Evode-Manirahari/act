import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';


export type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'recording'; seconds: number }
  | { kind: 'saved_local'; marks: number }
  | { kind: 'uploading'; remaining: number }
  | { kind: 'uploaded' }
  | { kind: 'processing' }
  | { kind: 'ready' }
  | { kind: 'failed'; reason: string };


interface Props {
  status: UploadStatus;
}

export default function UploadStatusPill({ status }: Props) {
  const { label, tone } = describe(status);
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </View>
  );
}


function describe(status: UploadStatus): {
  label: string;
  tone: { bg: string; border: string; text: string; dot: string };
} {
  switch (status.kind) {
    case 'idle':
      return { label: 'Ready', tone: tones.idle };
    case 'recording':
      return { label: `Recording • ${formatTime(status.seconds)}`, tone: tones.recording };
    case 'saved_local':
      return {
        label:
          status.marks > 0
            ? `Saved locally • ${status.marks} mark${status.marks === 1 ? '' : 's'}`
            : 'Saved locally',
        tone: tones.local,
      };
    case 'uploading':
      return { label: `Uploading • ${status.remaining} pending`, tone: tones.uploading };
    case 'uploaded':
      return { label: 'Uploaded', tone: tones.done };
    case 'processing':
      return { label: 'Processing on server', tone: tones.uploading };
    case 'ready':
      return { label: 'Ready for review', tone: tones.done };
    case 'failed':
      return { label: `Failed • ${status.reason}`, tone: tones.failed };
  }
}


function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}


const tones = {
  idle: {
    bg: colors.surfaceAlt,
    border: colors.border,
    text: colors.textMuted,
    dot: colors.textLight,
  },
  recording: {
    bg: '#FEE2E2',
    border: '#FCA5A5',
    text: '#B91C1C',
    dot: '#DC2626',
  },
  local: {
    bg: colors.surfaceAlt,
    border: colors.border,
    text: colors.text,
    dot: colors.primary,
  },
  uploading: {
    bg: '#FEF3C7',
    border: '#FCD34D',
    text: '#92400E',
    dot: '#F59E0B',
  },
  done: {
    bg: colors.successLight,
    border: colors.success,
    text: '#065F46',
    dot: colors.success,
  },
  failed: {
    bg: '#FEE2E2',
    border: '#FCA5A5',
    text: '#991B1B',
    dot: colors.error,
  },
};


const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});
