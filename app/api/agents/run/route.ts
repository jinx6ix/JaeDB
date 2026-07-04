// app/api/agents/run/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startRun } from '@/lib/agents/orchestrator';
import type { AgentRunRequest } from '@/lib/agents/types';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json()) as AgentRunRequest;
  if (!body?.prompt?.trim()) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  const userId = (session.user as any)?.id || null;
  const { runId } = await startRun(body, userId);
  return NextResponse.json({ runId, status: 'running' });
}
