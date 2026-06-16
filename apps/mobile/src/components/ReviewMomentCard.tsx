/**
 * ReviewMomentCard — evidence-first review card for one proposed moment.
 *
 * The reviewer (a lead tech) must never approve a black box, so the card
 * surfaces, before any action:
 *   - the mono time window (start_s–end_s), moment_type, and score
 *   - a transcript excerpt / "why it matters" if present
 *   - a frame/clip evidence placeholder (no media URL yet)
 *   - a compact summary of evidence_json (object OR JSON string — both handled)
 *   - LOUD safety flags (red lockout rail + safety checklist) when the moment
 *     is safety-related, gating publish on the reviewer confirming the checks.
 *
 * Once approved, the embedded ReviewDebriefPanel walks the post-job debrief
 * loop. A one-tap "Approve + publish" fallback is preserved alongside it.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts, labelStyle } from '../theme/typography';
import type { MomentOut } from '../api/captureApi';
import type {
  ElicitationQuestion,
  KnowledgeObject,
} from '../api/libraryApi';
import ReviewDebriefPanel, { type DebriefStep } from './ReviewDebriefPanel';

export type ReviewMomentCardProps = {
  moment: MomentOut;
  /** True when the legacy one-tap approve+publish path is in flight. */
  busy: boolean;
  /** Label for the one-tap publish path while it runs. */
  publishStageLabel: string;
  /** Published card from the one-tap path, if any. */
  publishedCard?: KnowledgeObject;
  /** Debrief loop state for this moment (owned by the screen). */
  debriefQuestion: ElicitationQuestion | null;
  debriefDraft: KnowledgeObject | null;
  debriefBusyStep: DebriefStep;
  debriefPublished: boolean;
  /** Existing review actions — preserved from the original screen. */
  onApproveAndPublish: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNeedsInfo: () => void;
  onOpenCard: (card: KnowledgeObject) => void;
  /** Debrief loop actions (wired to the API clients in the screen). */
  onGenerateQuestion: () => void;
  onSubmitAnswer: (questionText: string, answerText: string) => void;
  onCompileDraft: () => void;
  onPublishDraft: () => void;
};

export default function ReviewMomentCard({
  moment,
  busy,
  publishStageLabel,
  publishedCard,
  debriefQuestion,
  debriefDraft,
  debriefBusyStep,
  debriefPublished,
  onApproveAndPublish,
  onApprove,
  onReject,
  onNeedsInfo,
  onOpenCard,
  onGenerateQuestion,
  onSubmitAnswer,
  onCompileDraft,
  onPublishDraft,
}: ReviewMomentCardProps) {
  const safety = useMemo(() => isSafetyMoment(moment), [moment]);
  const evidenceItems = useMemo(() => summarizeEvidence(moment.evidence_json), [moment.evidence_json]);
  const transcriptExcerpt = useMemo(() => extractTranscript(moment.evidence_json), [moment.evidence_json]);

  const approved = moment.status === 'approved';

  // The safety checklist gates the debrief publish path. Non-safety moments
  // have nothing to confirm, so they're considered cleared by default.
  const [safetyChecked, setSafetyChecked] = useState(false);
  const safetyCleared = !safety || safetyChecked;

  return (
    <View style={[styles.card, safety && styles.cardSafety]}>
      {safety ? <View style={styles.safetyRail} /> : null}

      <View style={styles.cardTop}>
        <View style={styles.cardTopText}>
          <Text style={styles.cardTitle}>{humanizeMomentType(moment.moment_type)}</Text>
          <Text style={styles.cardTime}>
            {formatTimestamp(moment.start_s)}–{formatTimestamp(moment.end_s)} ·{' '}
            {moment.moment_type}
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreLabel}>score</Text>
          <Text style={styles.scoreText}>{Math.round(moment.score)}</Text>
        </View>
      </View>

      {/* Loud safety banner — lockout treatment */}
      {safety ? (
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyBannerTitle}>Safety-critical moment</Text>
          <Text style={styles.safetyBannerBody}>
            Confirm the safety checks below before this goes to apprentices.
          </Text>
        </View>
      ) : null}

      {/* Why it matters / reasoning */}
      {moment.why_it_matters ? (
        <View style={styles.evidenceBlock}>
          <Text style={styles.evidenceLabel}>Why it matters</Text>
          <Text style={styles.evidenceBody}>{moment.why_it_matters}</Text>
        </View>
      ) : null}

      {/* Transcript excerpt, if the evidence carried one */}
      {transcriptExcerpt ? (
        <View style={styles.evidenceBlock}>
          <Text style={styles.evidenceLabel}>Transcript excerpt</Text>
          <Text style={styles.transcriptText}>&ldquo;{transcriptExcerpt}&rdquo;</Text>
        </View>
      ) : null}

      {/* Frame / clip evidence placeholder — no media URL yet */}
      <View style={styles.clipPlaceholder}>
        <Text style={styles.clipPlaceholderLabel}>Clip evidence</Text>
        <Text style={styles.clipPlaceholderBody}>
          Frames {formatTimestamp(moment.start_s)}–{formatTimestamp(moment.end_s)} · preview
          attaches when media is processed
        </Text>
      </View>

      {/* Compact evidence_json summary */}
      {evidenceItems.length > 0 ? (
        <View style={styles.evidenceBlock}>
          <Text style={styles.evidenceLabel}>Detector evidence</Text>
          <View style={styles.evidenceList}>
            {evidenceItems.map((item) => (
              <View key={item.key} style={styles.evidenceRow}>
                <Text style={styles.evidenceKey}>{item.key}</Text>
                <Text style={styles.evidenceValue} numberOfLines={3}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Status + flags */}
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{moment.status}</Text>
        </View>
        {moment.do_not_interrupt ? (
          <View style={[styles.metaPill, styles.warnPill]}>
            <Text style={[styles.metaText, styles.warnText]}>post-job only</Text>
          </View>
        ) : null}
        {publishedCard || debriefPublished ? (
          <View style={[styles.metaPill, styles.publishedPill]}>
            <Text style={[styles.metaText, styles.publishedText]}>published</Text>
          </View>
        ) : null}
      </View>

      {/* Safety checklist — must be confirmed before publish on safety moments */}
      {safety ? (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Reviewer safety check</Text>
          <ChecklistItem
            label="Safety boundary is stated and correct for an apprentice"
            checked={safetyChecked}
            onToggle={() => setSafetyChecked((v) => !v)}
          />
          <ChecklistItem
            label="No step here should be done by a newer tech alone"
            checked={safetyChecked}
            onToggle={() => setSafetyChecked((v) => !v)}
          />
          {!safetyChecked ? (
            <Text style={styles.checklistHint}>
              Confirm the checks to unlock approve + publish.
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* One-tap fallback path (preserved) */}
      {!approved ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !safetyCleared}
            style={({ pressed }) => [
              styles.actionButton,
              styles.approveButton,
              styles.approveActionButton,
              pressed && styles.pressed,
              (busy || !safetyCleared) && styles.disabled,
            ]}
            onPress={() => (publishedCard ? onOpenCard(publishedCard) : onApproveAndPublish())}
          >
            <Text numberOfLines={1} style={styles.approveText}>
              {publishedCard ? 'Open card' : busy ? publishStageLabel : 'Approve + publish'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !!publishedCard}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
              (busy || !!publishedCard) && styles.disabled,
            ]}
            onPress={onNeedsInfo}
          >
            <Text style={styles.actionText}>Follow-up</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !!publishedCard}
            style={({ pressed }) => [
              styles.actionButton,
              styles.rejectButton,
              pressed && styles.pressed,
              (busy || !!publishedCard) && styles.disabled,
            ]}
            onPress={onReject}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Approve to open the debrief loop (the visible primary path) */}
      {!approved ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || !safetyCleared}
          onPress={onApprove}
          style={({ pressed }) => [
            styles.debriefCta,
            pressed && styles.pressed,
            (busy || !safetyCleared) && styles.disabled,
          ]}
        >
          <Text style={styles.debriefCtaText}>Approve &amp; start debrief →</Text>
        </Pressable>
      ) : null}

      {/* Debrief loop — visible after approve */}
      {approved && !publishedCard ? (
        <ReviewDebriefPanel
          momentId={moment.id}
          question={debriefQuestion}
          draft={debriefDraft}
          busyStep={debriefBusyStep}
          published={debriefPublished}
          onGenerateQuestion={onGenerateQuestion}
          onSubmitAnswer={onSubmitAnswer}
          onCompileDraft={onCompileDraft}
          onPublish={onPublishDraft}
          onOpenCard={onOpenCard}
        />
      ) : null}

      {/* If the one-tap path already published, link to the card */}
      {publishedCard ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.publishedBand, pressed && styles.pressed]}
          onPress={() => onOpenCard(publishedCard)}
        >
          <Text style={styles.publishedBandLabel}>Apprentice card</Text>
          <Text style={styles.publishedBandTitle}>{publishedCard.title}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChecklistItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
      hitSlop={8}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

// ---- evidence + formatting helpers ----------------------------------------

type EvidenceItem = { key: string; value: string };

/**
 * A moment is safety-related when its type names safety/lockout/hazard, or the
 * evidence carries an explicit safety flag / boundary. Surfaced loudly.
 */
export function isSafetyMoment(moment: MomentOut): boolean {
  const type = moment.moment_type?.toLowerCase() ?? '';
  if (/safety|hazard|lockout|danger|shock|electrical|arc|gas|refrigerant|burn/.test(type)) {
    return true;
  }
  const evidence = parseEvidence(moment.evidence_json);
  if (!evidence) return false;
  if (typeof evidence === 'string') {
    return /safety|hazard|lockout|danger|do not/i.test(evidence);
  }
  const flag =
    evidence.safety ??
    evidence.is_safety ??
    evidence.safety_flag ??
    evidence.safety_boundary ??
    evidence.hazard;
  if (flag === true) return true;
  if (typeof flag === 'string' && flag.trim().length > 0) return true;
  return false;
}

/** Parse evidence_json whether it arrives as an object or a JSON string. */
function parseEvidence(
  evidence: MomentOut['evidence_json'],
): Record<string, unknown> | string | null {
  if (evidence == null) return null;
  if (typeof evidence === 'string') {
    const trimmed = evidence.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }
  return evidence;
}

/** Pull a transcript / quote excerpt out of the evidence if present. */
function extractTranscript(evidence: MomentOut['evidence_json']): string | null {
  const parsed = parseEvidence(evidence);
  if (!parsed || typeof parsed === 'string') return null;
  const candidate =
    parsed.transcript ??
    parsed.transcript_excerpt ??
    parsed.quote ??
    parsed.utterance ??
    parsed.text;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim().slice(0, 400);
  }
  return null;
}

/** Compact key/value list summarizing evidence_json for the reviewer. */
export function summarizeEvidence(
  evidence: MomentOut['evidence_json'],
): EvidenceItem[] {
  const parsed = parseEvidence(evidence);
  if (!parsed) return [];
  if (typeof parsed === 'string') {
    return [{ key: 'note', value: parsed.slice(0, 400) }];
  }
  return Object.entries(parsed)
    // Transcript is rendered separately; don't duplicate it in the summary.
    .filter(([key]) => !/^(transcript|transcript_excerpt|quote|utterance|text)$/i.test(key))
    .map(([key, value]) => ({ key, value: formatEvidenceValue(value) }))
    .filter((item) => item.value.length > 0)
    .slice(0, 8);
}

function formatEvidenceValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.slice(0, 200);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value).slice(0, 200);
  } catch {
    return String(value);
  }
}

export function humanizeMomentType(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatTimestamp(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  cardSafety: {
    borderColor: colors.error,
    paddingLeft: 18,
  },
  safetyRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.error,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTopText: { flex: 1 },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  cardTime: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  scorePill: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scoreLabel: {
    ...labelStyle,
    color: colors.primary,
    fontSize: 8,
  },
  scoreText: {
    color: colors.primary,
    fontFamily: fonts.monoSemibold,
    fontSize: 16,
  },
  safetyBanner: {
    borderRadius: 8,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    padding: 12,
    gap: 3,
  },
  safetyBannerTitle: {
    color: colors.error,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  safetyBannerBody: {
    color: '#7A1212',
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  evidenceBlock: { gap: 5 },
  evidenceLabel: {
    ...labelStyle,
    color: colors.steel500,
    fontSize: 10,
  },
  evidenceBody: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  transcriptText: {
    color: colors.steel700,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  clipPlaceholder: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
  },
  clipPlaceholderLabel: {
    ...labelStyle,
    color: colors.steel500,
    fontSize: 10,
  },
  clipPlaceholderBody: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  evidenceList: { gap: 6 },
  evidenceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  evidenceKey: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.steel500,
    minWidth: 96,
    textTransform: 'lowercase',
  },
  evidenceValue: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaText: {
    ...labelStyle,
    color: colors.textMuted,
    fontSize: 10,
  },
  warnPill: { backgroundColor: colors.cautionLight },
  warnText: { color: colors.caution },
  publishedPill: { backgroundColor: colors.successLight },
  publishedText: { color: '#065F46' },
  checklist: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
    padding: 12,
    gap: 10,
  },
  checklistTitle: {
    ...labelStyle,
    color: colors.error,
    fontSize: 11,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: colors.error,
  },
  checkMark: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  checkLabel: {
    flex: 1,
    color: '#7A1212',
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  checklistHint: {
    color: colors.error,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  approveButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  approveActionButton: { flex: 1.35 },
  rejectButton: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
  },
  actionText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  approveText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  rejectText: {
    color: colors.error,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  debriefCta: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debriefCtaText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  publishedBand: {
    borderRadius: 8,
    backgroundColor: colors.successLight,
    padding: 12,
    gap: 3,
  },
  publishedBandLabel: {
    ...labelStyle,
    color: '#065F46',
    fontSize: 10,
  },
  publishedBandTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
  },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.5 },
});
