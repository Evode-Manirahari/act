import type { MomentOut } from '../../api/captureApi';
import { selectEvidenceMedia } from '../reviewEvidence';

describe('review evidence media selection', () => {
  it('prefers signed extracted frame images', () => {
    const media = selectEvidenceMedia(moment({
      evidence_frames: [
        {
          id: 'frame-1',
          recording_id: 'rec-1',
          timestamp_s: 12,
          storage_key: 'recordings/rec-1/frames/mark_0000.jpg',
          thumbnail_key: null,
          url: 'https://cdn.example.test/recordings/rec-1/frames/mark_0000.jpg?signed=1',
          thumbnail_url: null,
          source: 'mark',
          created_at: '2026-06-29T00:00:00.000Z',
        },
      ],
    }));

    expect(media).toEqual({
      kind: 'image',
      label: 'Marked frame',
      url: 'https://cdn.example.test/recordings/rec-1/frames/mark_0000.jpg?signed=1',
      timestampSeconds: 12,
      source: 'mark',
      storageKey: 'recordings/rec-1/frames/mark_0000.jpg',
    });
  });

  it('falls back to media URLs inside evidence_json', () => {
    const media = selectEvidenceMedia(moment({
      evidence_json: JSON.stringify({
        clip_url: 'https://cdn.example.test/clips/moment-1.mp4?signed=1',
      }),
    }));

    expect(media).toEqual({
      kind: 'clip',
      label: 'Evidence clip',
      url: 'https://cdn.example.test/clips/moment-1.mp4?signed=1',
    });
  });

  it('keeps indexed frame metadata visible when no signed URL is available', () => {
    const media = selectEvidenceMedia(moment({
      evidence_frames: [
        {
          id: 'frame-2',
          recording_id: 'rec-1',
          timestamp_s: 30,
          storage_key: 'recordings/rec-1/frames/sampled_0003.jpg',
          thumbnail_key: null,
          url: null,
          thumbnail_url: null,
          source: 'sampled',
          created_at: '2026-06-29T00:00:00.000Z',
        },
      ],
    }));

    expect(media).toEqual({
      kind: 'frame',
      label: 'Sampled frame',
      timestampSeconds: 30,
      source: 'sampled',
      storageKey: 'recordings/rec-1/frames/sampled_0003.jpg',
    });
  });
});

function moment(overrides: Partial<MomentOut> = {}): MomentOut {
  return {
    id: 'moment-1',
    recording_id: 'rec-1',
    start_s: 10,
    end_s: 20,
    moment_type: 'sensory_cue',
    score: 8,
    do_not_interrupt: false,
    evidence_json: {},
    why_it_matters: null,
    status: 'proposed',
    reviewer_id: null,
    reviewed_at: null,
    review_note: null,
    created_at: '2026-06-29T00:00:00.000Z',
    ...overrides,
  };
}
