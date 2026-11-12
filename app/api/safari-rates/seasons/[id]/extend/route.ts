import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const seasonId = Number(id);
  const body = await req.json();
  const { name, startDate, endDate } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'name, startDate and endDate are required' }, { status: 400 });
  }

  // Verify season exists
  const existing = await prisma.sRSeason.findUnique({ where: { id: seasonId } });
  if (!existing) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) {
    return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
  }

  // Check overlap for new dates (excluding this season)
  const overlapping = await prisma.sRSeason.findFirst({
    where: {
      hotelId: existing.hotelId,
      id: { not: seasonId },
      OR: [
        { startDate: { lte: start }, endDate: { gte: start } },
        { startDate: { lte: end }, endDate: { gte: end } },
        { startDate: { gte: start }, endDate: { lte: end } },
      ],
    },
  });
  if (overlapping) {
    const fmt = (d: Date) => d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    return NextResponse.json({ error: `New season dates overlap with existing season "${overlapping.name}" (${fmt(overlapping.startDate)} – ${fmt(overlapping.endDate)})` }, { status: 409 });
  }

  // Create the new season
  const newSeason = await prisma.sRSeason.create({
    data: { hotelId: existing.hotelId, name, startDate: start, endDate: end },
  });

  // Copy all prices from the old season to the new season (rates stay the same)
  const prices = await prisma.sRRoomPrice.findMany({ where: { seasonId } });

  const newPrices = await prisma.$transaction(
    prices.map(p =>
      prisma.sRRoomPrice.create({
        data: {
          roomTypeId: p.roomTypeId,
          seasonId: newSeason.id,
          boardBasis: p.boardBasis,
          ratePerPersonSharing: p.ratePerPersonSharing,
          singleRoomRate: p.singleRoomRate,
          childRate: p.childRate,
          thirdAdultRate: p.thirdAdultRate,
          currency: p.currency,
        },
      })
    )
  );

  return NextResponse.json({ season: newSeason, prices: newPrices }, { status: 201 });
}
