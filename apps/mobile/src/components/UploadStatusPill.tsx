import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../design/tokens';


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
      return { label: `Recording · ${formatTime(status.seconds)}`, tone: tones.recording };
    case 'saved_local':
      return {
        label:
          status.marks > 0
            ? `Saved locally · ${status.marks} mark${status.marks === 1 ? '' : 's'}`
            : 'Saved locally',
        tone: tones.local,
      };
    case 'uploading':
      return { label: `Uploading · ${status.remaining} pending`, tone: tones.uploading };
    case 'uploaded':
      return { label: 'Uploaded', tone: tones.done };
    case 'processing':
      return { label: 'Processing on server', tone: tones.uploading };
    case 'ready':
      return { label: 'Ready for review', tone: tones.done };
    case 'failed':
      return { label: `Failed · ${status.reason}`, tone: tones.failed };
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


// Token-mapped tones so the pill reads in the Field Instrument palette:
// steel neutral (idle/local), loud error (recording/failed), caution amber
// (uploading/processing), verified green (done). Borders match ActPill.
const tones = {
  idle: {
    bg: colors.surfaceAlt,
    border: colors.border,
    text: colors.textMuted,
    dot: colors.textLight,
  },
  recording: {
    bg: colors.errorLight,
    border: '#EBC4C4',
    text: colors.error,
    dot: colors.error,
  },
  local: {
    bg: colors.surfaceAlt,
    border: colors.border,
    text: colors.text,
    dot: colors.primary,
  },
  uploading: {
    bg: colors.cautionLight,
    border: '#F1D7A8',
    text: colors.caution,
    dot: colors.caution,
  },
  done: {
    bg: colors.successLight,
    border: '#BCE3C6',
    text: '#0E6B30',
    dot: colors.success,
  },
  failed: {
    bg: colors.errorLight,
    border: '#EBC4C4',
    text: colors.error,
    dot: colors.error,
  },
};


const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm, // squared instrument chip, matches ActPill
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 2 },
  text: {
    fontSize: 11.5,
    fontFamily: fonts.monoSemibold, // mono readout for timers/counts
    letterSpacing: 0.3,
    flexShrink: 1,
    maxWidth: 220,
  },
});
