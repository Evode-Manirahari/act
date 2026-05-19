import { NextResponse } from 'next/server';

import { api } from '@/lib/api';


export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const card = await api.compile(id);
    return NextResponse.json(card);
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : 'compile failed', {
      status: 502,
    });
  }
}
