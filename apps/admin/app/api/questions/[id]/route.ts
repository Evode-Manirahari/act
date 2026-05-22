import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    question?: string;
    reason?: string;
    status?: string;
  };
  try {
    const updated = await api.editQuestion(id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'edit failed', {
      status: 502,
    });
  }
}
