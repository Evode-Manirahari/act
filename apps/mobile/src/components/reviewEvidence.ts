import type { ExtractedFrameOut, MomentOut } from '../api/captureApi';

export type EvidenceMedia =
  | {
      kind: 'image';
      label: string;
      url: string;
      timestampSeconds?: number;
      source?: string;
      storageKey?: string;
    }
  | {
      kind: 'clip';
      label: string;
      url: string;
      timestampSeconds?: number;
      source?: string;
      storageKey?: string;
    }
  | {
      kind: 'frame';
      label: string;
      timestampSeconds?: number;
      source?: string;
      storageKey?: string;
    };

export function selectEvidenceMedia(moment: MomentOut): EvidenceMedia | null {
  const frames = Array.isArray(moment.evidence_frames) ? moment.evidence_frames : [];
  const frameWithPreview = frames.find((frame) => isImageUrl(previewUrlForFrame(frame)));
  if (frameWithPreview) {
    return {
      kind: 'image',
      label: frameLabel(frameWithPreview),
      url: previewUrlForFrame(frameWithPreview) as string,
      timestampSeconds: frameWithPreview.timestamp_s,
      source: frameWithPreview.source,
      storageKey: frameWithPreview.storage_key,
    };
  }

  const evidenceUrl = firstEvidenceMediaUrl(moment.evidence_json);
  if (evidenceUrl) {
    const kind = isImageUrl(evidenceUrl) ? 'image' : 'clip';
    return {
      kind,
      label: kind === 'image' ? 'Evidence image' : 'Evidence clip',
      url: evidenceUrl,
    };
  }

  const indexedFrame = frames[0];
  if (indexedFrame) {
    return {
      kind: 'frame',
      label: frameLabel(indexedFrame),
      timestampSeconds: indexedFrame.timestamp_s,
      source: indexedFrame.source,
      storageKey: indexedFrame.storage_key,
    };
  }

  return null;
}

function previewUrlForFrame(frame: ExtractedFrameOut): string | null {
  return firstNonEmpty(frame.thumbnail_url, frame.url);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function firstEvidenceMediaUrl(evidence: MomentOut['evidence_json']): string | null {
  const parsed = parseEvidence(evidence);
  const urls: string[] = [];
  collectMediaUrls(parsed, '', urls);
  return urls[0] ?? null;
}

function collectMediaUrls(value: unknown, key: string, urls: string[], depth = 0): void {
  if (depth > 4 || urls.length > 0 || value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isLikelyUrl(trimmed) && (isMediaKey(key) || isMediaUrl(trimmed))) {
      urls.push(trimmed);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectMediaUrls(item, key, urls, depth + 1);
      if (urls.length > 0) return;
    }
    return;
  }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectMediaUrls(childValue, childKey, urls, depth + 1);
      if (urls.length > 0) return;
    }
  }
}

function parseEvidence(evidence: MomentOut['evidence_json']): unknown {
  if (evidence == null) return null;
  if (typeof evidence !== 'string') return evidence;
  const trimmed = evidence.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isMediaKey(key: string): boolean {
  return /(?:frame|image|thumbnail|clip|media|video).*url|url/i.test(key);
}

function isImageUrl(value: string | null): value is string {
  return typeof value === 'string' && /\.(?:jpe?g|png|webp|gif)(?:\?|#|$)/i.test(value);
}

function isMediaUrl(value: string): boolean {
  return /\.(?:jpe?g|png|webp|gif|mp4|mov|m4v|webm)(?:\?|#|$)/i.test(value);
}

function frameLabel(frame: ExtractedFrameOut): string {
  return frame.source === 'mark' ? 'Marked frame' : 'Sampled frame';
}
