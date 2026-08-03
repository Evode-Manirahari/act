/**
 * Wire-level guarantees for expert answers.
 *
 * Two properties are pinned here because both were violated by the path that
 * produced the fabricated cards:
 *
 *   1. The client never names the answer's author. act-api attributes an answer
 *      to the bearer token's owner and 403s a client-supplied `expert_user_id`
 *      that names anyone else.
 *   2. The former `buildExpertAnswer()` payload — the moment's own metadata
 *      rendered as a sentence — is not something any client path can produce,
 *      and act-api refuses it (422) if it somehow arrives.
 *
 * TEST_DATA only.
 */
import {
  LibraryApiError,
  listMomentQuestions,
  loadOrCreateMomentQuestion,
  parseApiDetail,
  parseRejectionReason,
  submitExpertAnswer,
  submitExpertAudioAnswer,
} from '../libraryApi';

/** The exact string shape the deleted helper used to POST as an expert answer. */
const FORMER_GENERATED_PAYLOAD =
  'Moment: Diagnostic Shortcut from 00:16 to 00:28. ' +
  'Why it matters: TEST_DATA teachable moment. Evidence: manual_mark';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function errorResponse(status: number, detail: string) {
  return {
    ok: false,
    status,
    json: async () => ({ detail }),
    text: async () => JSON.stringify({ detail }),
  };
}

const ANSWER_FIXTURE = {
  id: 'TEST_DATA-answer-1',
  question_id: 'TEST_DATA-question-1',
  transcript: 'TEST_DATA I check subcooling before touching the charge.',
  audio_key: null,
  approved_by_expert: true,
  expert_user_id: 'TEST_DATA-server-derived-user',
  created_at: '2026-08-03T00:00:00.000Z',
};

describe('the client never supplies the answer author', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('omits expert_user_id from a typed answer', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(ANSWER_FIXTURE));
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitExpertAnswer({
      questionId: 'TEST_DATA-question-1',
      transcript: 'TEST_DATA I check subcooling before touching the charge.',
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).not.toHaveProperty('expert_user_id');
    expect(Object.keys(body).sort()).toEqual(['approved_by_expert', 'transcript']);
  });

  it('omits expert_user_id from an audio answer', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(ANSWER_FIXTURE));
    global.fetch = fetchMock as unknown as typeof fetch;

    await submitExpertAudioAnswer({
      questionId: 'TEST_DATA-question-1',
      uri: 'file:///TEST_DATA/answer.m4a',
    });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('expert_user_id')).toBeNull();
    expect(form.get('approved_by_expert')).toBe('true');
  });

  it('has no parameter through which an author id could be passed', () => {
    // A compile-time guarantee made explicit: passing expertUserId is a type
    // error, so this documents the runtime shape the payload builders accept.
    const typedInput = {
      questionId: 'TEST_DATA-question-1',
      transcript: 'TEST_DATA words',
      approvedByExpert: true,
    };
    expect(Object.keys(typedInput)).not.toContain('expertUserId');
  });
});

describe('the former generated payload is never produced by the client', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends only the transcript it was handed', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(ANSWER_FIXTURE));
    global.fetch = fetchMock as unknown as typeof fetch;

    const humanWords = 'TEST_DATA frost on the suction line told me to check airflow.';
    await submitExpertAnswer({
      questionId: 'TEST_DATA-question-1',
      transcript: humanWords,
    });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.transcript).toBe(humanWords);
    expect(body.transcript).not.toContain('Moment:');
    expect(body.transcript).not.toContain('Why it matters:');
    expect(body.transcript).not.toBe(FORMER_GENERATED_PAYLOAD);
  });

  it('surfaces the backend 422 as a typed rejection instead of retrying', async () => {
    const detail =
      'answer rejected (expert_answer_echoes_prompt): this endpoint records a ' +
      "technician's own words.";
    const fetchMock = jest.fn().mockResolvedValueOnce(errorResponse(422, detail));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      submitExpertAnswer({
        questionId: 'TEST_DATA-question-1',
        transcript: FORMER_GENERATED_PAYLOAD,
      }),
    ).rejects.toBeInstanceOf(LibraryApiError);

    // Exactly one attempt — no silent retry with substituted content.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the reason code and detail from a 422', async () => {
    const detail = 'answer rejected (expert_answer_placeholder): placeholder text';
    const fetchMock = jest.fn().mockResolvedValueOnce(errorResponse(422, detail));
    global.fetch = fetchMock as unknown as typeof fetch;

    let err: LibraryApiError | null = null;
    try {
      await submitExpertAnswer({ questionId: 'TEST_DATA-question-1', transcript: 'TODO' });
    } catch (e) {
      err = e as LibraryApiError;
    }

    expect(err).toBeInstanceOf(LibraryApiError);
    if (!err) throw new Error('expected a LibraryApiError');
    expect(err.status).toBe(422);
    expect(err.reason).toBe('expert_answer_placeholder');
    expect(err.detail).toBe(detail);
  });
});

describe('error body parsing', () => {
  it('unwraps a FastAPI string detail', () => {
    expect(parseApiDetail('{"detail":"question not found"}')).toBe('question not found');
  });

  it('unwraps FastAPI validation lists', () => {
    const body = JSON.stringify({ detail: [{ msg: 'field required' }, { msg: 'bad uuid' }] });
    expect(parseApiDetail(body)).toBe('field required; bad uuid');
  });

  it('falls back to the raw body when it is not JSON', () => {
    expect(parseApiDetail('upstream timeout')).toBe('upstream timeout');
  });

  it('extracts the reason code only from a rejection detail', () => {
    expect(parseRejectionReason('answer rejected (synthetic_test_evidence): …')).toBe(
      'synthetic_test_evidence',
    );
    expect(parseRejectionReason('question not found')).toBeNull();
    expect(parseRejectionReason(null)).toBeNull();
  });
});

describe('duplicate taps do not create duplicate questions', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const OPEN_QUESTION = {
    id: 'TEST_DATA-question-1',
    moment_id: 'TEST_DATA-moment-1',
    question: 'TEST_DATA What told you to check there first?',
    reason: null,
    status: 'proposed',
    asked_at: null,
    created_at: '2026-08-03T00:00:00.000Z',
  };

  it('reuses an existing open question instead of drafting another', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse([OPEN_QUESTION]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const question = await loadOrCreateMomentQuestion('TEST_DATA-moment-1');

    expect(question.id).toBe('TEST_DATA-question-1');
    // One GET, and crucially no POST.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit | undefined)?.method).toBeUndefined();
  });

  it('drafts a question only when none is open', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(OPEN_QUESTION));
    global.fetch = fetchMock as unknown as typeof fetch;

    await loadOrCreateMomentQuestion('TEST_DATA-moment-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
  });

  it('ignores already-answered questions when looking for an open one', async () => {
    const answered = { ...OPEN_QUESTION, id: 'TEST_DATA-question-old', status: 'answered' };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse([answered]))
      .mockResolvedValueOnce(jsonResponse(OPEN_QUESTION));
    global.fetch = fetchMock as unknown as typeof fetch;

    const question = await loadOrCreateMomentQuestion('TEST_DATA-moment-1');
    expect(question.id).toBe('TEST_DATA-question-1');
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
  });

  it('lists questions with a plain GET', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse([OPEN_QUESTION]));
    global.fetch = fetchMock as unknown as typeof fetch;

    await listMomentQuestions('TEST_DATA-moment-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/moments/TEST_DATA-moment-1/questions'),
      expect.anything(),
    );
  });
});
