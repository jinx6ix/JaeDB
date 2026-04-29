// app/api/safari-rates/lookup/route.ts
// Returns hotel prices whose season contains the given date (strict match first, fallback to all)
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
    currency: true,
    roomType: { select: { id: true, name: true, maxOccupancy: true } },
    season: { select: { id: true, name: true, startDate: true, endDate: true } },
  };

  // 1. Try exact date match within a season
  if (dateStr) {
    const queryDate = new Date(dateStr);
    // Normalise to midnight UTC so date-only comparison works
    queryDate.setUTCHours(0, 0, 0, 0);

    const prices = await prisma.sRRoomPrice.findMany({
      where: {
        boardBasis,
        roomType: { hotelId: Number(hotelId) },
        season: {
          startDate: { lte: queryDate },
          endDate:   { gte: queryDate },
        },
      },
      select: priceSelect,
      orderBy: { roomType: { name: 'asc' } },
    });

    if (prices.length > 0) {
      return NextResponse.json({ prices, matched: true, matchType: 'season' });
    }
  }

  // 2. Fallback: return all prices for this hotel + board (any season)
  const fallback = await prisma.sRRoomPrice.findMany({
    where: {
      boardBasis,
      roomType: { hotelId: Number(hotelId) },
    },
    select: priceSelect,
    orderBy: [{ season: { startDate: 'desc' } }, { roomType: { name: 'asc' } }],
  });

  return NextResponse.json({ prices: fallback, matched: false, matchType: 'fallback' });
}
