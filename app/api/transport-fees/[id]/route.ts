// app/api/transport-fees/[id]/route.ts
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
  const transportFee = await prisma.transportFee.findUnique({
    where: { id },
  });
  if (!transportFee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(transportFee);
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
  const { vehicleType, sittingCapacity, fee, currency, seasonId, route, notes } = body;

  try {
    const transportFee = await prisma.transportFee.update({
      where: { id },
      data: {
        vehicleType: vehicleType !== undefined ? vehicleType.trim() : undefined,
        sittingCapacity: sittingCapacity !== undefined ? Number(sittingCapacity) : undefined,
        fee: fee !== undefined ? Number(fee) : undefined,
        currency: currency !== undefined ? currency : undefined,
        seasonId: seasonId !== undefined ? seasonId : undefined,
        route: route !== undefined ? route : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });
    return NextResponse.json(transportFee);
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
    await prisma.transportFee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
