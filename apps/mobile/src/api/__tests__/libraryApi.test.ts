import {
  compileMoment,
  generateMomentQuestion,
  logTrainingEvent,
  publishKnowledgeObject,
  submitExpertAnswer,
} from '../libraryApi';

describe('library publishing API', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('calls the review-to-publish endpoints with typed JSON bodies', async () => {
    const question = {
      id: 'q-1',
      moment_id: 'm-1',
      question: 'What did you verify?',
      reason: null,
      status: 'drafted',
      asked_at: null,
      created_at: '2026-05-28T00:00:00.000Z',
    };
    const answer = {
      id: 'a-1',
      question_id: 'q-1',
      transcript: 'Verified airflow before charging.',
      audio_key: null,
      approved_by_expert: true,
      expert_user_id: 'u-1',
      created_at: '2026-05-28T00:00:00.000Z',
    };
    const draftCard = trainingCard({ id: 'ko-1', status: 'draft' });
    const publishedCard = trainingCard({
      id: 'ko-1',
      status: 'published',
      published_at: '2026-05-28T00:01:00.000Z',
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(question))
      .mockResolvedValueOnce(jsonResponse(answer))
      .mockResolvedValueOnce(jsonResponse(draftCard))
      .mockResolvedValueOnce(jsonResponse(publishedCard));
    global.fetch = fetchMock as typeof fetch;

    await generateMomentQuestion('m-1');
    await submitExpertAnswer({
      questionId: 'q-1',
      transcript: 'Verified airflow before charging.',
      approvedByExpert: true,
      expertUserId: 'u-1',
    });
    await compileMoment({ momentId: 'm-1', trade: 'hvac' });
    await publishKnowledgeObject('ko-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/moments/m-1/questions'),
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({
      transcript: 'Verified airflow before charging.',
      approved_by_expert: true,
      expert_user_id: 'u-1',
    });
    expect(JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string)).toEqual({
      trade: 'hvac',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/knowledge-objects/ko-1/publish'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('logs apprentice completion events', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ id: 'event-1' }));
    global.fetch = fetchMock as typeof fetch;

    await logTrainingEvent({
      knowledgeObjectId: 'ko-1',
      userId: 'user-1',
      eventType: 'completed',
      score: 1,
      note: 'Completed after quiz: correct',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/training-events'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      knowledge_object_id: 'ko-1',
      user_id: 'user-1',
      event_type: 'completed',
      score: 1,
      note: 'Completed after quiz: correct',
    });
  });

  it('logs anonymous training events without requiring a demo session user', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ id: 'event-1' }));
    global.fetch = fetchMock as typeof fetch;

    await logTrainingEvent({
      knowledgeObjectId: 'ko-1',
      eventType: 'viewed',
    });

    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      knowledge_object_id: 'ko-1',
      user_id: null,
      event_type: 'viewed',
      score: null,
      note: null,
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function trainingCard(overrides: Partial<{
  id: string;
  status: string;
  published_at: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 'ko-1',
    moment_id: 'm-1',
    title: 'Check airflow before charge',
    trade: 'hvac',
    situation: 'No-cool call.',
    observable_cue: 'Weak return airflow.',
    expert_reasoning: 'Restriction can mimic low charge.',
    decision: 'Verify airflow first.',
    novice_trap: 'Adding refrigerant first.',
    safety_boundary: 'Avoid running a freezing coil.',
    verification: 'Recheck split, superheat, and subcooling.',
    quiz_json: {
      question: 'What comes first?',
      choices: ['Airflow', 'Charge'],
      answer: 'Airflow',
    },
    tags_json: ['airflow'],
    status: overrides.status ?? 'draft',
    created_by: 'u-1',
    published_at: overrides.published_at ?? null,
    created_at: '2026-05-28T00:00:00.000Z',
  };
}
