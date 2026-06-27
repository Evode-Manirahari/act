import {
  askLibrary,
  compileMoment,
  debriefNext,
  editMomentQuestion,
  generateMomentQuestion,
  getPilotWeeklyReport,
  logTrainingEvent,
  publishKnowledgeObject,
  safetyCheckKnowledgeObject,
  submitExpertAudioAnswer,
  submitExpertAnswer,
  upsertReviewChecklist,
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

  it('submits expert audio answers as multipart form data', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({
      id: 'a-1',
      question_id: 'q-1',
      transcript: 'I checked static pressure first.',
      audio_key: 'questions/q-1/answers/audio.m4a',
      approved_by_expert: true,
      expert_user_id: 'u-1',
      created_at: '2026-05-28T00:00:00.000Z',
    }));
    global.fetch = fetchMock as typeof fetch;

    await submitExpertAudioAnswer({
      questionId: 'q-1',
      uri: 'file:///tmp/answer.m4a',
      expertUserId: 'u-1',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/questions/q-1/answers/audio'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(init.headers).toEqual({ Accept: 'application/json' });
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('requests the turn-based debrief agent with spoken questions enabled', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({
      complete: false,
      turn: 1,
      max_turns: 3,
      question_id: 'q-1',
      question: 'What told you to check airflow first?',
      reason: 'captures expert diagnostic reasoning',
      question_audio_url: 'https://cdn.example.test/debrief/q-1.mp3',
    }));
    global.fetch = fetchMock as typeof fetch;

    const turn = await debriefNext('m-1', { speak: true });

    expect(turn.question_id).toBe('q-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/moments/m-1/debrief/next?speak=true'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls question edit, checklist, ask, and report endpoints with expected payloads', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'q-1',
        moment_id: 'm-1',
        question: 'What made this a safety moment?',
        reason: null,
        status: 'asked',
        asked_at: null,
        created_at: '2026-05-28T00:00:00.000Z',
      }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'rc-1',
        knowledge_object_id: 'ko-1',
        moment_id: 'm-1',
        reviewer_id: 'u-1',
        evidence_checked: true,
        safety_reviewed: true,
        novice_trap_clear: true,
        quiz_answer_correct: true,
        approved_by: 'u-1',
        notes: 'Ready.',
        completed_at: '2026-05-28T00:02:00.000Z',
        created_at: '2026-05-28T00:00:00.000Z',
      }))
      .mockResolvedValueOnce(jsonResponse(trainingCard({
        id: 'ko-1',
        status: 'draft',
      })))
      .mockResolvedValueOnce(jsonResponse({
        answer: 'Reviewed card answer.',
        citations: [{ card_id: 'ko-1', title: 'Check airflow before charge' }],
        refusal_reason: null,
      }))
      .mockResolvedValueOnce(jsonResponse({
        week: '2026-W22',
        summary: 'Pilot is moving.',
        metrics: {
          jobs_captured: 1,
          recordings_ready: 1,
          moments_detected: 1,
          moments_approved: 1,
          moments_rejected: 0,
          cards_published: 1,
          training_events: 1,
          quiz_attempts: 1,
          quiz_correct: 1,
          outcomes_logged: 1,
          callbacks: 0,
        },
        wins: [],
        risks: [],
        operator_questions: [],
        narrative_ok: true,
      }));
    global.fetch = fetchMock as typeof fetch;

    await editMomentQuestion({
      questionId: 'q-1',
      question: 'What made this a safety moment?',
      status: 'asked',
    });
    await upsertReviewChecklist({
      knowledgeObjectId: 'ko-1',
      reviewerId: 'u-1',
      notes: 'Ready.',
    });
    await safetyCheckKnowledgeObject('ko-1');
    await askLibrary({ query: 'What cards mention airflow?', trade: 'hvac', limit: 2 });
    await getPilotWeeklyReport({ accountId: 'acct-1', baselineRate: 5 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/questions/q-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      question: 'What made this a safety moment?',
      status: 'asked',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/knowledge-objects/ko-1/review-checklist'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({
      reviewer_id: 'u-1',
      evidence_checked: true,
      safety_reviewed: true,
      novice_trap_clear: true,
      quiz_answer_correct: true,
      approved_by: 'u-1',
      notes: 'Ready.',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/knowledge-objects/ko-1/safety-check'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse((fetchMock.mock.calls[3][1] as RequestInit).body as string)).toEqual({
      query: 'What cards mention airflow?',
      trade: 'hvac',
      account_id: null,
      limit: 2,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('/dashboard/weekly-report?account_id=acct-1&baseline_rate=5'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
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
