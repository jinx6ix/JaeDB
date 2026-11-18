// app/api/park-fees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all park fees
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const countyId = searchParams.get('countyId');

  const parkFees = await prisma.parkFee.findMany({
    where: countyId ? { countyId: Number(countyId) } : {},
    include: { county: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(parkFees);
}

// POST — create a new park fee
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { countyId, name, fee, currency, seasonId, seasonName, notes } = body;

    if (!countyId || !name || fee === undefined) {
      return NextResponse.json({ error: 'countyId, name and fee are required' }, { status: 400 });
    }

    const parkFee = await prisma.parkFee.create({
      data: {
        countyId: Number(countyId),
        name: name.trim(),
        fee: Number(fee),
        currency: currency || 'USD',
        seasonId: seasonId || null,
        seasonName: seasonName || null,
        notes: notes || null,
      },
      include: { county: true },
    });
    return NextResponse.json(parkFee, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
