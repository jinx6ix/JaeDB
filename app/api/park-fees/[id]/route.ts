// app/api/park-fees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const parkFee = await prisma.parkFee.findUnique({
    where: { id },
    include: { county: true },
  });
  if (!parkFee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(parkFee);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { countyId, name, fee, currency, seasonId, seasonName, notes } = body;

  try {
    const parkFee = await prisma.parkFee.update({
      where: { id },
      data: {
        countyId: countyId !== undefined ? Number(countyId) : undefined,
        name: name !== undefined ? name.trim() : undefined,
        fee: fee !== undefined ? Number(fee) : undefined,
        currency: currency !== undefined ? currency : undefined,
        seasonId: seasonId !== undefined ? seasonId : undefined,
        seasonName: seasonName !== undefined ? seasonName : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { county: true },
    });
    return NextResponse.json(parkFee);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.parkFee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
