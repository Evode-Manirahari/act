import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    status: string;
    reviewer_id?: string;
    review_note?: string;
  };
  try {
    const updated = await api.reviewMoment(id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'review failed', {
      status: 502,
    });
  }
}
