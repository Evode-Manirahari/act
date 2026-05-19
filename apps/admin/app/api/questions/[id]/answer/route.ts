import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { transcript: string };
  try {
    const answer = await api.submitAnswer(id, body);
    return NextResponse.json(answer);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'answer failed', {
      status: 502,
    });
  }
}
