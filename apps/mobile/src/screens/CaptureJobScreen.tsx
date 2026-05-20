/**
 * CaptureJobScreen — the heart of ACT Capture.
 *
 * Lets a senior tech start a recording, drop "mark this" events at teachable
 * moments, and ship everything to the backend. Marks are saved locally
 * before being sent so they survive flaky connectivity and app kills. The
 * recorded video is uploaded via the queue, which retries with backoff and
 * resumes on next app launch.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { colors } from '../theme/colors';
import MarkButton, { MarkType } from '../components/MarkButton';
import UploadStatusPill, { UploadStatus } from '../components/UploadStatusPill';
import {
  createRecording,
  getRecording,
  RecordingOut,
  RecordingStatus,
} from '../api/captureApi';
import { captureQueue, QueueItem } from '../lib/offlineUploadQueue';
import { createDemoSession, DemoSession } from '../api/actApi';
import type { RootStackParamList } from '../navigation/RootNavigator';


type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface LocalMark {
  id: string;
  timestampSeconds: number;
  markType: MarkType;
  note?: string;
}

export default function CaptureJobScreen() {
  const navigation = useNavigation<NavProp>();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingStartRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbortRef = useRef<{ aborted: boolean } | null>(null);

  const [session, setSession] = useState<DemoSession | null>(null);
  const [recording, setRecording] = useState<RecordingOut | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [marks, setMarks] = useState<LocalMark[]>([]);
  const [status, setStatus] = useState<UploadStatus>({ kind: 'idle' });
  const [pending, setPending] = useState<QueueItem[]>([]);

  // Bootstrap a demo session on mount so the screen can create recordings.
  // In a real pilot, user + job come from the auth/dispatch flow upstream.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await createDemoSession();
        if (!cancelled) setSession(s);
      } catch (err) {
        if (!cancelled) {
          setStatus({
            kind: 'failed',
            reason: err instanceof Error ? err.message : 'session error',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Drain any queued work from previous sessions and keep the pill in sync.
  useEffect(() => {
    void captureQueue.flush();
    const unsub = captureQueue.subscribe((items) => setPending(items));
    void captureQueue.items().then(setPending);
    return unsub;
  }, []);

  // Tick the on-screen timer while recording.
  useEffect(() => {
    if (!isRecording) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = setInterval(() => {
      setElapsedSeconds((Date.now() - recordingStartRef.current) / 1000);
    }, 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [isRecording]);

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    const cam = camPerm?.granted ? camPerm : await requestCamPerm();
    if (!cam?.granted) {
      Alert.alert('Camera permission required', 'ACT Capture needs the camera to record jobs.');
      return false;
    }
    const mic = micPerm?.granted ? micPerm : await requestMicPerm();
    if (!mic?.granted) {
      Alert.alert(
        'Microphone permission required',
        'Audio is how we capture what the tech says about the job — please grant access.',
      );
      return false;
    }
    return true;
  }, [camPerm, micPerm, requestCamPerm, requestMicPerm]);

  async function handleStart() {
    if (!session) return;
    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      setStatus({ kind: 'recording', seconds: 0 });
      const created = await createRecording({
        jobId: session.job_id,
        userId: session.user_id,
        contentType: 'video/mp4',
        trade: 'hvac',
        consentState: 'internal_training',
        deviceMeta: { camera: 'phone_chest_or_handheld' },
      });
      setRecording(created.recording);
      setPresignedUrl(created.upload_url);
      setMarks([]);
      setElapsedSeconds(0);
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const result = await cameraRef.current?.recordAsync({ maxDuration: 1800 });
      if (result?.uri) {
        await enqueueUpload(created.recording, result.uri);
      }
    } catch (err) {
      setIsRecording(false);
      setStatus({
        kind: 'failed',
        reason: err instanceof Error ? err.message.slice(0, 64) : 'start failed',
      });
    }
  }

  function handleStop() {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function enqueueUpload(rec: RecordingOut, fileUri: string) {
    setStatus({ kind: 'saved_local', marks: marks.length });
    const duration = (Date.now() - recordingStartRef.current) / 1000;

    await captureQueue.enqueueUpload({
      recordingId: rec.id,
      fileUri,
      presignedUrl,
      contentType: rec.content_type ?? 'video/mp4',
    });
    await captureQueue.enqueueComplete({
      recordingId: rec.id,
      durationSeconds: duration,
      endedAt: new Date().toISOString(),
    });
    // Auto-kick the server pipeline as soon as the upload + complete
    // land. The queue treats a 409 as success, so re-trying is safe.
    await captureQueue.enqueueProcess({ recordingId: rec.id });

    const result = await captureQueue.flush();
    if (result.remaining === 0) {
      setStatus({ kind: 'uploaded' });
      // Start polling the server status — the BG pipeline runs in act-api
      // and will move us through processing → ready (or failed).
      startStatusPolling(rec.id);
    } else {
      setStatus({ kind: 'uploading', remaining: result.remaining });
    }
  }

  function startStatusPolling(recordingId: string) {
    // Cancel any prior poll so the latest recording wins.
    if (pollAbortRef.current) pollAbortRef.current.aborted = true;
    const controller = { aborted: false };
    pollAbortRef.current = controller;
    void (async () => {
      const start = Date.now();
      while (!controller.aborted) {
        try {
          const detail = await getRecording(recordingId);
          if (controller.aborted) return;
          const remoteStatus: RecordingStatus = detail.recording.status;
          if (remoteStatus === 'processing') {
            setStatus({ kind: 'processing' });
          } else if (remoteStatus === 'ready') {
            setStatus({ kind: 'ready' });
            return;
          } else if (remoteStatus === 'failed') {
            setStatus({
              kind: 'failed',
              reason: 'server pipeline failed — check fly logs',
            });
            return;
          }
        } catch (err) {
          // Transient network errors shouldn't kill the poll; just retry.
        }
        // Stop polling after 10 minutes regardless — that's well beyond
        // the worst-case processing time and lets the UI recover.
        if (Date.now() - start > 10 * 60 * 1000) {
          setStatus({
            kind: 'failed',
            reason: 'timed out waiting for the server to finish',
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    })();
  }

  async function handleMark(kind: MarkType) {
    if (!isRecording || !recording) return;
    const timestamp = (Date.now() - recordingStartRef.current) / 1000;
    const local: LocalMark = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestampSeconds: timestamp,
      markType: kind,
    };
    setMarks((prev) => [...prev, local]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await captureQueue.enqueueMark({
      recordingId: recording.id,
      timestampSeconds: timestamp,
      markType: kind,
      createdBy: session?.user_id,
    });
    void captureQueue.flush();
  }

  const canRecord = !!session && !!camPerm?.granted;
  const headerLabel = session ? `Job ${session.job_id.slice(0, 8)}` : 'Starting session…';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerBack}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>ACT Capture</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>{headerLabel}</Text>
        <UploadStatusPill
          status={
            isRecording
              ? { kind: 'recording', seconds: elapsedSeconds }
              : pending.length > 0
                ? { kind: 'uploading', remaining: pending.length }
                : status
          }
        />
      </View>

      <View style={styles.cameraWrap}>
        {camPerm?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            mode="video"
            facing="back"
            videoQuality="720p"
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.placeholderText}>Camera permission required</Text>
            <Pressable style={styles.permButton} onPress={ensurePermissions}>
              <Text style={styles.permButtonText}>Grant access</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.markRow}>
          <MarkButton disabled={!isRecording} onMark={handleMark} />
        </View>

        <View style={styles.bottomRow}>
          {isRecording ? (
            <Pressable style={[styles.recordBtn, styles.stopBtn]} onPress={handleStop}>
              <Text style={styles.recordBtnText}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.recordBtn, !canRecord && styles.disabledBtn]}
              disabled={!canRecord}
              onPress={handleStart}
            >
              {session ? (
                <Text style={styles.recordBtnText}>Start recording</Text>
              ) : (
                <ActivityIndicator color="#fff" />
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.marksList}>
          <Text style={styles.marksHeader}>
            Marks this session ({marks.length})
          </Text>
          <ScrollView style={styles.marksScroll}>
            {marks.length === 0 ? (
              <Text style={styles.marksEmpty}>
                Tap the big button when something matters. Long-press to change what kind of moment it is.
              </Text>
            ) : (
              marks
                .slice()
                .reverse()
                .map((m) => (
                  <View key={m.id} style={styles.markRowItem}>
                    <Text style={styles.markTime}>{formatTimestamp(m.timestampSeconds)}</Text>
                    <Text style={styles.markKind}>{m.markType}</Text>
                  </View>
                ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}


function formatTimestamp(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: 1 },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  subHeaderText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  cameraWrap: {
    height: 280,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: { flex: 1 },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 24,
    gap: 12,
  },
  placeholderText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  permButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  permButtonText: { color: '#fff', fontWeight: '700' },
  controls: { flex: 1, paddingHorizontal: 16, gap: 16 },
  markRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  bottomRow: { alignItems: 'center' },
  recordBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: colors.primary,
    minWidth: 220,
    alignItems: 'center',
  },
  stopBtn: { backgroundColor: colors.error },
  disabledBtn: { opacity: 0.5 },
  recordBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  marksList: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 16,
  },
  marksHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  marksScroll: { flex: 1 },
  marksEmpty: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  markRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markTime: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  markKind: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
