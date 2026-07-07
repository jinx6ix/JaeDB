// app/api/agents/runs/[id]/confirm/route.ts
// The human half of the 👤 "ask user for confirmation" capability.
// POST { approve: boolean, note?: string } to resolve the most recent
// confirm-request on a run that's currently 'awaiting-confirmation'.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resumeRun } from '@/lib/agents/orchestrator';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const approve = Boolean(body?.approve);
  const note = typeof body?.note === 'string' ? body.note : undefined;

  try {
    await resumeRun(id, approve, note);
    return NextResponse.json({ ok: true, runId: id, approved: approve });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to resolve confirmation' }, { status: 400 });
  }
}
