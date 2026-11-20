// app/api/safari-rates/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hotelId    = searchParams.get('hotelId');
  const boardBasis = searchParams.get('boardBasis') || 'FB';
  const dateStr    = searchParams.get('date');

  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });

  const priceSelect = {
    id: true,
    boardBasis: true,
    ratePerPersonSharing: true,
    singleRoomRate: true,
    childRate: true,
    thirdAdultRate: true,
    currency: true,
    roomType: { select: { id: true, name: true, maxOccupancy: true } },
    season: { select: { id: true, name: true, startDate: true, endDate: true } },
  };

  // 1. Try exact date match within a season.
  // We match seasons separately first (avoids nested relation date-filter issues),
  // then fetch prices for those seasons.
  if (dateStr) {
    const queryDate = new Date(dateStr);
    queryDate.setUTCHours(0, 0, 0, 0);

    const matchingSeasons = await prisma.sRSeason.findMany({
      where: {
        hotelId: Number(hotelId),
        startDate: { lte: queryDate },
        endDate: { gte: queryDate },
      },
      select: { id: true },
    });

    if (matchingSeasons.length > 0) {
      const seasonIds = matchingSeasons.map((s) => s.id);
      const prices = await prisma.sRRoomPrice.findMany({
        where: {
          boardBasis,
          roomType: { hotelId: Number(hotelId) },
          seasonId: { in: seasonIds },
        },
        select: priceSelect,
        orderBy: { roomType: { name: 'asc' } },
      });
      if (prices.length > 0) {
        return NextResponse.json({ prices, matched: true, matchType: 'season' });
      }
    }
  }

  // 2. Fallback: all prices for this hotel + board basis
  const fallback = await prisma.sRRoomPrice.findMany({
    where: { boardBasis, roomType: { hotelId: Number(hotelId) } },
    select: priceSelect,
    orderBy: [{ season: { startDate: 'desc' } }, { roomType: { name: 'asc' } }],
  });
  return NextResponse.json({ prices: fallback, matched: false, matchType: 'fallback' });
}
