import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const question = await api.generateQuestion(id);
    return NextResponse.json(question);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'generation failed', {
      status: 502,
    });
  }
}
