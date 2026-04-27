// app/api/agents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: {
      clients: { orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, phone: true } },
      _count: { select: { clients: true } },
    },
  });
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        name: body.name,
        company: body.company ?? undefined,
        email: body.email ?? undefined,
        phone: body.phone ?? undefined,
        address: body.address ?? undefined,
        notes: body.notes ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });
    return NextResponse.json(agent);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.agent.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
