// app/api/safari-rates/counties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, region, description } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await prisma.sRCounty.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: 'Destination not found' }, { status: 404 });

  // Check name uniqueness if name is being changed
  if (name !== undefined && name.trim() !== existing.name) {
    const dup = await prisma.sRCounty.findFirst({
      where: { name: name.trim(), id: { not: Number(id) } },
    });
    if (dup) return NextResponse.json({ error: 'A destination with this name already exists' }, { status: 409 });
  }

  const county = await prisma.sRCounty.update({
    where: { id: Number(id) },
    data: {
      name: name !== undefined ? name.trim() : existing.name,
      region: region !== undefined ? (region.trim() || null) : existing.region,
    },
  });
  return NextResponse.json(county);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await prisma.sRCounty.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { hotels: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Destination not found' }, { status: 404 });

  // Block deletion if hotels exist in this destination
  if (existing._count.hotels > 0) {
    return NextResponse.json(
      { error: `Cannot delete "${existing.name}": it has ${existing._count.hotels} hotel(s). Move or delete them first.` },
      { status: 409 }
    );
  }

  await prisma.sRCounty.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
