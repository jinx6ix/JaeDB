// app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const clients = await prisma.client.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    orderBy: { name: 'asc' },
    include: { _count: { select: { bookings: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const client = await prisma.client.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        nationality: body.nationality || null,
        isResident: body.isResident ?? false,
        address: body.address || null,
        notes: body.notes || null,
        agentId: body.agentId || null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
