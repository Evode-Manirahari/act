import { NextResponse } from 'next/server';

import { ExpertAnswerOut, forwardMultipart } from '@/lib/api';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const incoming = await request.formData();
  // Re-pack the form so the file blob streams through cleanly to act-api.
  const forward = new FormData();
  const audio = incoming.get('audio');
  if (!(audio instanceof Blob)) {
    return new NextResponse('audio file missing from form data', { status: 400 });
  }
  forward.append('audio', audio, (audio as File).name || 'answer.webm');
  const approved = incoming.get('approved_by_expert');
  if (approved) forward.append('approved_by_expert', String(approved));
  const expertUserId = incoming.get('expert_user_id');
  if (expertUserId) forward.append('expert_user_id', String(expertUserId));

  try {
    const answer = await forwardMultipart<ExpertAnswerOut>(
      `/questions/${id}/answers/audio`,
      forward,
    );
    return NextResponse.json(answer);
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : 'audio answer failed',
      { status: 502 },
    );
  }
}
