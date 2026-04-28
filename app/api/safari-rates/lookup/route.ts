// app/api/safari-rates/lookup/route.ts
// Fast rate lookup for the costing calculator
// GET /api/safari-rates/lookup?hotelId=123&boardBasis=FB&date=2026-08-12
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hotelId   = searchParams.get('hotelId');
  const boardBasis = searchParams.get('boardBasis') || 'FB';
  const dateStr   = searchParams.get('date');

  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });

  const queryDate = dateStr ? new Date(dateStr) : new Date();

  // Find all room prices for this hotel that match the board basis
  // and optionally fall within a season covering the date
  const prices = await prisma.sRRoomPrice.findMany({
    where: {
      boardBasis,
      roomType: { hotelId: Number(hotelId) },
      ...(dateStr ? {
        season: {
          startDate: { lte: queryDate },
          endDate:   { gte: queryDate },
        },
      } : {}),
    },
    include: {
      roomType: { select: { id: true, name: true, maxOccupancy: true } },
      season:   { select: { id: true, name: true, startDate: true, endDate: true } },
    },
    orderBy: { roomType: { name: 'asc' } },
  });

  // If date-filtered returns nothing, return all prices for this hotel/board (any season)
  if (prices.length === 0 && dateStr) {
    const fallback = await prisma.sRRoomPrice.findMany({
      where: { boardBasis, roomType: { hotelId: Number(hotelId) } },
      include: {
        roomType: { select: { id: true, name: true, maxOccupancy: true } },
        season:   { select: { id: true, name: true, startDate: true, endDate: true } },
      },
      orderBy: { roomType: { name: 'asc' } },
    });
    return NextResponse.json({ prices: fallback, matched: false });
  }

  return NextResponse.json({ prices, matched: Boolean(dateStr) });
}
