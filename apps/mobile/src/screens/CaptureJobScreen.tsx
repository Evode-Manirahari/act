/**
 * CaptureJobScreen — the heart of ACT Capture.
 *
 * Lets a senior tech start a recording, drop "mark this" events at teachable
 * moments, and ship everything to the backend. Marks are saved locally
 * before being sent so they survive flaky connectivity and app kills. The
 * recorded video is uploaded via the queue, which retries with backoff and
 * resumes on next app launch.
 *
 * UX intent: while recording, the tech sees ONE obvious, glove-friendly
 * action — a dominant MARK THIS slab. The mark taxonomy and notes are tucked
 * behind a long-press / "+" affordance so working never forces a choice.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';
import ActAppShell from '../components/ActAppShell';
import { MarkType } from '../components/MarkButton';
import CaptureMarkButton from '../components/CaptureMarkButton';
import UploadStatusPill, { UploadStatus } from '../components/UploadStatusPill';
import {
  createRecording,
  getRecording,
  logJobEvent,
} from '../api/captureApi';
import type { ConsentState, RecordingOut, RecordingStatus } from '../api/captureApi';
import { captureQueue } from '../lib/offlineUploadQueue';
import type { QueueItem } from '../lib/offlineUploadQueue';
import { createCaptureSession } from '../api/captureApi';
import type { DemoSession } from '../api/captureApi';
import type { PilotStackParamList } from '../navigation/PilotNavigator';


type NavProp = NativeStackNavigationProp<PilotStackParamList>;

interface LocalMark {
  id: string;
  timestampSeconds: number;
  markType: MarkType;
  note?: string;
}

const CONSENT_OPTIONS: Array<{
  value: ConsentState;
  label: string;
  detail: string;
  blocksRecording?: boolean;
}> = [
  {
    value: 'internal_training',
    label: 'Internal',
    detail: 'shop training',
  },
  {
    value: 'company_only',
    label: 'Company',
    detail: 'private library',
  },
  {
    value: 'public_with_review',
    label: 'Reviewed',
    detail: 'approved sharing',
  },
  {
    value: 'do_not_share',
    label: 'No record',
    detail: 'customer opted out',
    blocksRecording: true,
  },
];

const LAST_RECORDING_KEY = 'act_capture_last_recording_id';

export default function CaptureJobScreen() {
  const navigation = useNavigation<NavProp>();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingStartRef = useRef<number>(0);
  const marksRef = useRef<LocalMark[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbortRef = useRef<{ aborted: boolean } | null>(null);

  const [session, setSession] = useState<DemoSession | null>(null);
  const [recording, setRecording] = useState<RecordingOut | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [marks, setMarks] = useState<LocalMark[]>([]);
  const [status, setStatus] = useState<UploadStatus>({ kind: 'idle' });
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [consentState, setConsentState] = useState<ConsentState>('internal_training');
  const [lastRecordingId, setLastRecordingId] = useState<string | null>(null);

  // No job is created on mount. The job (and its session) materializes the
  // moment the tech actually starts a capture — opening this screen must never
  // leave an empty job behind in the operator's data.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(LAST_RECORDING_KEY).then((id) => {
      if (!cancelled && id) setLastRecordingId(id);
    });
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

  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);

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
    if (consentState === 'do_not_share') {
      Alert.alert('Recording blocked', 'Customer opted out. Do not start capture for this visit.');
      return;
    }
    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      setStatus({ kind: 'recording', seconds: 0 });
      // First start on this screen: create the job now (verified identity when
      // logged in, demo session otherwise). Reused for subsequent captures.
      let activeSession = session;
      if (!activeSession) {
        activeSession = await createCaptureSession();
        setSession(activeSession);
      }
      const created = await createRecording({
        jobId: activeSession.job_id,
        userId: activeSession.user_id,
        contentType: 'video/mp4',
        trade: 'hvac',
        consentState,
        deviceMeta: { camera: 'phone_chest_or_handheld' },
      });
      setRecording(created.recording);
      emitCaptureEvent('recording_started', created.recording, {
        consent_state: consentState,
        trade: created.recording.trade,
      });
      setLastRecordingId(created.recording.id);
      void AsyncStorage.setItem(LAST_RECORDING_KEY, created.recording.id);
      marksRef.current = [];
      setMarks([]);
      setElapsedSeconds(0);
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const result = await cameraRef.current?.recordAsync({ maxDuration: 1800 });
      if (result?.uri) {
        await enqueueUpload(created.recording, result.uri, created.upload_url);
      } else {
        setStatus({ kind: 'failed', reason: 'recording did not save video' });
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

  // Confirm before stopping — Stop is danger-coded and should never fire by
  // accident with gloves on. Keeps handleStop's behavior intact.
  function confirmStop() {
    Alert.alert(
      'Stop capture?',
      'This ends the recording and starts the upload. You can review moments after it processes.',
      [
        { text: 'Keep recording', style: 'cancel' },
        { text: 'Stop & upload', style: 'destructive', onPress: handleStop },
      ],
    );
  }

  function emitCaptureEvent(
    eventType: string,
    rec?: RecordingOut | null,
    payload?: Record<string, unknown>,
  ) {
    const target = rec ?? recording;
    void logJobEvent({
      eventType,
      actorId: session?.user_id ?? null,
      jobId: target?.job_id ?? session?.job_id ?? null,
      recordingId: target?.id ?? null,
      payload: payload ?? null,
    }).catch(() => {
      // Event telemetry should never break capture in a machine room.
    });
  }

  async function enqueueUpload(
    rec: RecordingOut,
    fileUri: string,
    uploadUrl: string | null,
  ) {
    setStatus({ kind: 'saved_local', marks: marksRef.current.length });
    const duration = (Date.now() - recordingStartRef.current) / 1000;
    emitCaptureEvent('recording_completed', rec, {
      duration_s: duration,
      marks: marksRef.current.length,
    });

    // Duration + endedAt ride on the upload item so the queue's post-upload
    // complete records them in one step. Enqueuing a separate complete here
    // would race that auto-complete, lose on a 409, and drop duration_s.
    await captureQueue.enqueueUpload({
      recordingId: rec.id,
      fileUri,
      presignedUrl: uploadUrl,
      contentType: rec.content_type ?? 'video/mp4',
      durationSeconds: duration,
      endedAt: new Date().toISOString(),
    });
    // Auto-kick the server pipeline as soon as the upload + complete
    // land. The queue treats a 409 as success, so re-trying is safe.
    await captureQueue.enqueueProcess({ recordingId: rec.id });
    emitCaptureEvent('process_queued', rec, { source: 'mobile_queue' });

    const result = await captureQueue.flush();
    if (result.remaining === 0) {
      setStatus({ kind: 'uploaded' });
      emitCaptureEvent('upload_completed', rec, {
        marks: marksRef.current.length,
      });
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

  // Default tap path — drops a mark at the active type. Same local-first
  // queue behavior as before; now routed through persistMark so the note
  // path reuses one persistence implementation.
  async function handleMark(kind: MarkType) {
    await persistMark(kind);
  }

  // Same persistence path as handleMark, but stamps a typed note. Uses the
  // platform Alert prompt where available (iOS); elsewhere it falls back to a
  // plain teachable mark so the moment is never lost. No new dependency.
  function handleAddNote() {
    if (!isRecording || !recording) return;
    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        'Add a note to this mark',
        'A short reason — what made this moment teachable?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save mark',
            onPress: (text?: string) => void persistMark('teachable', text?.trim() || undefined),
          },
        ],
        'plain-text',
      );
    } else {
      // Android / unsupported: drop the mark now so it isn't lost; the note
      // can be added during review.
      void persistMark('teachable');
      Alert.alert('Mark saved', 'Add the note during review on this device.');
    }
  }

  // Persist a mark (optionally with a note) via the exact same local-first
  // queue path as handleMark.
  async function persistMark(kind: MarkType, note?: string) {
    if (!isRecording || !recording) return;
    const timestamp = (Date.now() - recordingStartRef.current) / 1000;
    const local: LocalMark = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestampSeconds: timestamp,
      markType: kind,
      note,
    };
    setMarks((prev) => {
      const next = [...prev, local];
      marksRef.current = next;
      return next;
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await captureQueue.enqueueMark({
      recordingId: recording.id,
      timestampSeconds: timestamp,
      markType: kind,
      note,
      createdBy: session?.user_id,
    });
    emitCaptureEvent('mark_added', recording, {
      timestamp_s: timestamp,
      mark_type: kind,
      has_note: !!note,
    });
    void captureQueue.flush();
  }

  const canRecord = !!camPerm?.granted && consentState !== 'do_not_share';
  const reviewRecordingId = recording?.id ?? lastRecordingId;
  const canReviewCurrent = status.kind === 'ready' && !!recording?.id;
  const blocked = consentState === 'do_not_share';

  // Drive the status pill: live timer while recording, queue depth otherwise.
  const pillStatus: UploadStatus = isRecording
    ? { kind: 'recording', seconds: elapsedSeconds }
    : pending.length > 0
      ? { kind: 'uploading', remaining: pending.length }
      : status;

  const shellMode = isRecording ? 'Recording' : 'Capture';

  return (
    <ActAppShell
      mode={shellMode}
      rightLabel={reviewRecordingId ? 'Review' : undefined}
      onRightPress={() =>
        reviewRecordingId &&
        navigation.navigate('PilotReview', { recordingId: reviewRecordingId })
      }
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
    >
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Status strip: job id + live status pill ---- */}
        <View style={styles.statusStrip}>
          <Text style={styles.jobLabel}>
            {session ? `JOB ${session.job_id.slice(0, 8)}` : 'NEW JOB ON START'}
          </Text>
          <UploadStatusPill status={pillStatus} />
        </View>

        {isRecording ? (
          /* ================= RECORDING STATE ================= */
          <View style={styles.gap}>
            {/* Instrument readout: timer + marks-saved count */}
            <View style={styles.readoutRow}>
              <View style={styles.readoutTile}>
                <Text style={styles.readoutValue}>{formatTimestamp(elapsedSeconds)}</Text>
                <Text style={styles.readoutLabel}>elapsed</Text>
              </View>
              <View style={styles.readoutTile}>
                <Text style={styles.readoutValue}>
                  {marks.length.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.readoutLabel}>marks saved</Text>
              </View>
            </View>

            {camPerm?.granted ? (
              <View style={styles.cameraWrap}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  mode="video"
                  facing="back"
                  videoQuality="720p"
                />
                <View style={styles.recBadge}>
                  <View style={styles.recDot} />
                  <Text style={styles.recBadgeText}>REC</Text>
                </View>
              </View>
            ) : null}

            {/* THE one obvious action */}
            <CaptureMarkButton disabled={!isRecording} onMark={handleMark} onAddNote={handleAddNote} />

            {/* Mic placeholder — audio is captured by the recorder; this is a
                cue that the tech's voice is being recorded. */}
            <View style={styles.micRow}>
              <View style={styles.micGlyph}>
                <View style={styles.micCapsule} />
                <View style={styles.micStand} />
              </View>
              <Text style={styles.micText}>Mic live · narrate what you see and why</Text>
            </View>

            {/* STOP — visually secondary, danger-coded, confirm-gated. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop capture"
              style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
              onPress={confirmStop}
            >
              <View style={styles.stopSquare} />
              <Text style={styles.stopText}>STOP CAPTURE</Text>
            </Pressable>

            <MarksList marks={marks} />
          </View>
        ) : canReviewCurrent ? (
          /* ================= REVIEW-READY STATE ================= */
          <View style={styles.gap}>
            <View style={styles.readyPanel}>
              <Text style={styles.readyKicker}>UPLOAD COMPLETE · PROCESSED</Text>
              <Text style={styles.readyTitle}>Capture ready for review</Text>
              <Text style={styles.readyDetail}>
                {marks.length} mark{marks.length === 1 ? '' : 's'} captured. Approve the
                teachable moments before any card publishes.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review for training"
              style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]}
              onPress={() =>
                recording && navigation.navigate('PilotReview', { recordingId: recording.id })
              }
            >
              <Text style={styles.reviewButtonText}>REVIEW FOR TRAINING</Text>
              <Text style={styles.reviewButtonDetail}>Approve moments before cards publish</Text>
            </Pressable>

            <MarksList marks={marks} />
          </View>
        ) : (
          /* ================= IDLE STATE ================= */
          <View style={styles.gap}>
            <View style={styles.idleHeader}>
              <Text style={styles.idleKicker}>HVAC · FIELD CAPTURE</Text>
              <Text style={styles.idleTitle}>Ready to capture senior tech knowledge</Text>
              <Text style={styles.idleSubtitle}>
                Record the job and tap MARK THIS at the teachable moments. Everything saves
                locally first, then uploads — even on flaky service.
              </Text>
            </View>

            {/* Consent selector — required before capture. */}
            <View style={styles.consentPanel}>
              <Text style={styles.consentTitle}>CONSENT</Text>
              <View style={styles.consentGrid}>
                {CONSENT_OPTIONS.map((option) => {
                  const selected = consentState === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={({ pressed }) => [
                        styles.consentOption,
                        selected && styles.consentOptionSelected,
                        option.blocksRecording && selected && styles.consentOptionBlocked,
                        pressed && styles.consentOptionPressed,
                      ]}
                      onPress={() => setConsentState(option.value)}
                    >
                      <Text
                        style={[
                          styles.consentOptionLabel,
                          selected && styles.consentOptionLabelSelected,
                          option.blocksRecording && selected && styles.consentOptionLabelBlocked,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.consentOptionDetail,
                          selected && styles.consentOptionDetailSelected,
                          option.blocksRecording && selected && styles.consentOptionDetailBlocked,
                        ]}
                      >
                        {option.detail}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Camera preview / permission gate. */}
            {camPerm?.granted ? (
              <View style={styles.cameraWrap}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  mode="video"
                  facing="back"
                  videoQuality="720p"
                />
              </View>
            ) : (
              <View style={[styles.cameraWrap, styles.cameraPlaceholder]}>
                <Text style={styles.placeholderText}>Camera permission required</Text>
                <Pressable style={styles.permButton} onPress={ensurePermissions}>
                  <Text style={styles.permButtonText}>Grant access</Text>
                </Pressable>
              </View>
            )}

            {/* Start capture — the single primary action in idle. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start capture"
              style={({ pressed }) => [
                styles.startButton,
                blocked && styles.startButtonBlocked,
                !canRecord && !blocked && styles.startButtonDisabled,
                pressed && styles.pressed,
              ]}
              disabled={!canRecord}
              onPress={handleStart}
            >
              {blocked ? (
                <Text style={styles.startButtonText}>RECORDING BLOCKED</Text>
              ) : (
                <>
                  <Text style={styles.startButtonText}>START CAPTURE</Text>
                  <Text style={styles.startButtonDetail}>Camera + mic · 30 min max</Text>
                </>
              )}
            </Pressable>

            {/* If a prior recording is uploading/processing, keep its list +
                review handoff visible. */}
            {(pending.length > 0 || status.kind !== 'idle') && marks.length > 0 && (
              <MarksList marks={marks} />
            )}
          </View>
        )}
      </ScrollView>
    </ActAppShell>
  );
}


function MarksList({ marks }: { marks: LocalMark[] }) {
  return (
    <View style={styles.marksList}>
      <Text style={styles.marksHeader}>TEACHABLE MARKS ({marks.length})</Text>
      <ScrollView style={styles.marksScroll} nestedScrollEnabled>
        {marks.length === 0 ? (
          <Text style={styles.marksEmpty}>Waiting for the first teachable mark.</Text>
        ) : (
          marks
            .slice()
            .reverse()
            .map((m) => (
              <View key={m.id} style={styles.markRowItem}>
                <Text style={styles.markTime}>{formatTimestamp(m.timestampSeconds)}</Text>
                <View style={styles.markRowRight}>
                  <Text style={styles.markKind}>{formatMarkType(m.markType)}</Text>
                  {m.note ? (
                    <Text style={styles.markNote} numberOfLines={1}>
                      {m.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
        )}
      </ScrollView>
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

function formatMarkType(kind: MarkType): string {
  if (kind === 'counterfactual') return 'Avoid';
  if (kind === 'sensory') return 'Notice';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}


const styles = StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 28 },
  gap: { gap: 14 },

  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  jobLabel: { ...labelStyle, color: colors.steel500, fontSize: 11 },

  // ---- Idle ----
  idleHeader: { gap: 8 },
  idleKicker: { ...labelStyle, color: colors.primary, fontSize: 12 },
  idleTitle: { color: colors.ink, fontSize: 26, lineHeight: 32, fontFamily: fonts.display },
  idleSubtitle: {
    color: colors.steel500,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
    fontFamily: fonts.body,
  },

  consentPanel: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  consentTitle: { ...labelStyle, color: colors.steel700, fontSize: 11 },
  consentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  consentOption: {
    width: '48%',
    minHeight: 58,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  consentOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  consentOptionBlocked: { borderColor: colors.error, backgroundColor: colors.errorLight },
  consentOptionPressed: { opacity: 0.72 },
  consentOptionLabel: { color: colors.text, fontSize: 14, fontFamily: fonts.semibold },
  consentOptionLabelSelected: { color: colors.primary },
  consentOptionLabelBlocked: { color: colors.error },
  consentOptionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 3, fontFamily: fonts.body },
  consentOptionDetailSelected: { color: colors.text },
  consentOptionDetailBlocked: { color: colors.error },

  // ---- Camera ----
  cameraWrap: {
    height: 220,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  camera: { flex: 1 },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 24,
    gap: 12,
  },
  placeholderText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', fontFamily: fonts.body },
  permButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  permButtonText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 15 },
  recBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  recBadgeText: { color: '#fff', fontFamily: fonts.monoSemibold, fontSize: 11, letterSpacing: 1 },

  // ---- Recording readout ----
  readoutRow: { flexDirection: 'row', gap: 12 },
  readoutTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  readoutValue: { color: colors.ink, fontSize: 28, fontFamily: fonts.mono },
  readoutLabel: { ...labelStyle, color: colors.steel500, fontSize: 10, marginTop: 4 },

  micRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  micGlyph: { width: 18, alignItems: 'center', gap: 2 },
  micCapsule: { width: 10, height: 14, borderRadius: 5, backgroundColor: colors.steel500 },
  micStand: { width: 13, height: 2, borderRadius: 1, backgroundColor: colors.steel500 },
  micText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body, flexShrink: 1 },

  // ---- Stop (secondary, danger-coded) ----
  stopButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  stopSquare: { width: 14, height: 14, borderRadius: 2, backgroundColor: colors.error },
  stopText: { color: colors.error, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },

  // ---- Start ----
  startButton: {
    minHeight: 76,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryPressed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  startButtonDisabled: { opacity: 0.5 },
  startButtonBlocked: { backgroundColor: colors.error, borderColor: colors.error },
  startButtonText: { color: '#fff', fontSize: 19, letterSpacing: 1, fontFamily: fonts.bold },
  startButtonDetail: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 4, fontFamily: fonts.medium },

  // ---- Review-ready ----
  readyPanel: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: 14,
    gap: 4,
  },
  readyKicker: { ...labelStyle, color: '#065F46', fontSize: 10 },
  readyTitle: { color: '#065F46', fontSize: 19, fontFamily: fonts.semibold },
  readyDetail: { color: '#047857', fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  reviewButton: {
    minHeight: 72,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryPressed,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  reviewButtonText: { color: '#fff', fontSize: 17, letterSpacing: 1, fontFamily: fonts.bold },
  reviewButtonDetail: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 4, fontFamily: fonts.medium },

  // ---- Shared ----
  pressed: { opacity: 0.78 },
  marksList: {
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  marksHeader: { ...labelStyle, color: colors.steel500, fontSize: 11, marginBottom: 8 },
  marksScroll: { maxHeight: 190 },
  marksEmpty: { fontSize: 13, color: colors.textMuted, lineHeight: 18, fontFamily: fonts.body },
  markRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  markTime: { fontSize: 15, color: colors.text, fontFamily: fonts.monoSemibold },
  markRowRight: { alignItems: 'flex-end', flexShrink: 1 },
  markKind: { ...labelStyle, color: colors.primary, fontSize: 11 },
  markNote: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body, marginTop: 2, maxWidth: 200 },
});
