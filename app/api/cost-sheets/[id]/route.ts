// app/api/cost-sheets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sheet = await prisma.costSheet.findUnique({
    where: { id: params.id },
    include: {
      client:  true,
      booking: { include: { client: true } },
      agent:   true,
    },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(sheet);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.costSheet.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
