// app/api/transport-fees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all transport fees
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vehicleType = searchParams.get('vehicleType');
  const seasonId = searchParams.get('seasonId');

  const transportFees = await prisma.transportFee.findMany({
    where: {
      ...(vehicleType ? { vehicleType: { contains: vehicleType, mode: 'insensitive' } } : {}),
      ...(seasonId ? { seasonId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(transportFees);
}

// POST — create a new transport fee
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { vehicleType, sittingCapacity, fee, currency, seasonId, route, notes } = body;

    if (!vehicleType || !sittingCapacity || fee === undefined || !seasonId) {
      return NextResponse.json({ error: 'vehicleType, sittingCapacity, fee and seasonId are required' }, { status: 400 });
    }

    const transportFee = await prisma.transportFee.create({
      data: {
        vehicleType: vehicleType.trim(),
        sittingCapacity: Number(sittingCapacity),
        fee: Number(fee),
        currency: currency || 'USD',
        seasonId,
        route: route || null,
        notes: notes || null,
      },
    });
    return NextResponse.json(transportFee, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
