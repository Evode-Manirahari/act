import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const checked = await api.safetyCheck(id);
    if (checked.safety_recommendation !== 'ready') {
      return new NextResponse(
        `Safety review blocked publishing: ${checked.safety_recommendation ?? 'unknown'}`,
        { status: 409 },
      );
    }
    await api.reviewChecklist(id, {
      evidence_checked: true,
      safety_reviewed: true,
      novice_trap_clear: true,
      quiz_answer_correct: true,
      notes: 'Admin publish path.',
    });
    const card = await api.publish(id);
    return NextResponse.json(card);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'publish failed', {
      status: 502,
    });
  }
}
