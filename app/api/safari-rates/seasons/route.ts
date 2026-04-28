import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper: check if a new/updated season overlaps any existing season for the same hotel
async function hasOverlap(hotelId: number, startDate: Date, endDate: Date, excludeId?: number): Promise<boolean> {
  const overlapping = await prisma.sRSeason.findFirst({
    where: {
      hotelId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        // New season starts inside an existing season
        { startDate: { lte: startDate }, endDate: { gte: startDate } },
        // New season ends inside an existing season
        { startDate: { lte: endDate }, endDate: { gte: endDate } },
        // New season completely contains an existing season
        { startDate: { gte: startDate }, endDate: { lte: endDate } }
      ]
    }
  });
  return overlapping !== null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const seasons = await prisma.sRSeason.findMany({
    where: hotelId ? { hotelId: Number(hotelId) } : undefined,
    include: { hotel: { include: { county: true } } },
    orderBy: [{ hotel: { name: 'asc' } }, { startDate: 'asc' }],
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { hotelId, name, startDate, endDate } = body;

  if (!hotelId || !name || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const hotelIdNum = Number(hotelId);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
  }

  // Check overlap
  if (await hasOverlap(hotelIdNum, start, end)) {
    return NextResponse.json({ error: 'Season dates overlap with an existing season for this hotel' }, { status: 409 });
  }

  const season = await prisma.sRSeason.create({
    data: { hotelId: hotelIdNum, name, startDate: start, endDate: end },
  });
  return NextResponse.json(season, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, name, startDate, endDate } = body;

  if (!id || !name || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const seasonId = Number(id);
  const existing = await prisma.sRSeason.findUnique({ where: { id: seasonId } });
  if (!existing) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
  }

  // Check overlap excluding this season
  if (await hasOverlap(existing.hotelId, start, end, seasonId)) {
    return NextResponse.json({ error: 'Season dates overlap with an existing season for this hotel' }, { status: 409 });
  }

  const updated = await prisma.sRSeason.update({
    where: { id: seasonId },
    data: { name, startDate: start, endDate: end },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.sRSeason.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}