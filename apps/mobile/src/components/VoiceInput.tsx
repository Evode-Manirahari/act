import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
type AVRecordingOptions = Audio.RecordingOptions;
import { Colors } from '../theme/colors';

declare const process: { env: Record<string, string | undefined> };
const BASE_URL = (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) || 'http://localhost:3001';

const RECORDING_OPTIONS: AVRecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  handsFreeMode?: boolean;
}

type RecordState = 'idle' | 'recording' | 'processing';

export default function VoiceInput({ onTranscript, disabled = false, handsFreeMode = false }: Props) {
  const [state, setState] = useState<RecordState>('idle');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Request mic permission on mount
  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ granted }) => {
      setHasPermission(granted);
    });
    return () => {
      stopTimer();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (state === 'recording') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [state]);

  function startTimer() {
    setElapsedSecs(0);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const startRecording = useCallback(async () => {
    if (state !== 'idle' || !hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setState('recording');
      startTimer();
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  }, [state, hasPermission]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording' || !recordingRef.current) return;

    stopTimer();
    setState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      const transcript = await transcribeAudio(uri);

      if (!transcript || transcript.length < 3) {
        onTranscript('');
        // Signal empty so caller can show "didn't catch that"
      } else {
        onTranscript(transcript);
      }
    } catch (err) {
      console.warn('Transcription failed, falling back to text input', err);
      onTranscript('');
    } finally {
      setState('idle');
      setElapsedSecs(0);
    }
  }, [state, onTranscript]);

  // Hands-free: auto-start on mount if enabled
  useEffect(() => {
    if (handsFreeMode && hasPermission && state === 'idle') {
      const t = setTimeout(startRecording, 300);
      return () => clearTimeout(t);
    }
  }, [handsFreeMode, hasPermission]);

  // No mic permission — render nothing (FieldScreen shows text-only)
  if (hasPermission === false) return null;

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.micBtn,
            isRecording && styles.micBtnRecording,
            isProcessing && styles.micBtnProcessing,
            disabled && styles.micBtnDisabled,
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={disabled || hasPermission === null}
          activeOpacity={0.8}
        >
          <Text style={styles.micIcon}>
            {isProcessing ? '⏳' : '🎤'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {isRecording && (
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{elapsedSecs}s</Text>
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingBadge}>
          <Text style={styles.processingText}>PROCESSING...</Text>
        </View>
      )}
    </View>
  );
}

async function transcribeAudio(uri: string): Promise<string> {
  const formData = new FormData();

  const audioFile = {
    uri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as any;

  formData.append('audio', audioFile);

  const res = await fetch(`${BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Transcription HTTP ${res.status}`);

  const data = await res.json();
  return data.transcript ?? '';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: '#3A0000',
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  micBtnProcessing: {
    backgroundColor: '#1A1A00',
    borderColor: '#888800',
  },
  micBtnDisabled: {
    opacity: 0.4,
  },
  micIcon: { fontSize: 18 },
  timerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'Courier New',
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  processingBadge: {
    position: 'absolute',
    bottom: -18,
    backgroundColor: 'transparent',
  },
  processingText: {
    fontFamily: 'Courier New',
    fontSize: 8,
    color: '#888800',
    letterSpacing: 0.5,
  },
});
