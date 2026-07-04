// app/api/agents/runs/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const origin = url.searchParams.get('origin');
  const take = Math.min(Number(url.searchParams.get('limit') || 20), 100);
  const runs = await prisma.agentRun.findMany({
    where: origin ? { origin } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, origin: true, prompt: true, status: true, summary: true, steps: true, createdAt: true },
  });
  return NextResponse.json(runs);
}
