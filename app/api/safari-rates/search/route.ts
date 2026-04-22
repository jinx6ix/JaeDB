import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const county    = searchParams.get('county') || '';
  const hotel     = searchParams.get('hotel')  || '';
  const checkin   = searchParams.get('checkin');
  const checkout  = searchParams.get('checkout');
  const board     = searchParams.get('board')  || '';

  const prices = await prisma.sRRoomPrice.findMany({
    where: {
      ...(board ? { boardBasis: board } : {}),
      roomType: {
        hotel: {
          ...(hotel  ? { name: { contains: hotel,  mode: 'insensitive' } } : {}),
          ...(county ? { county: { name: { contains: county, mode: 'insensitive' } } } : {}),
        },
      },
      ...(checkin && checkout ? {
        season: {
          startDate: { lte: new Date(checkout) },
          endDate:   { gte: new Date(checkin)  },
        },
      } : {}),
    },
    include: {
      roomType: { include: { hotel: { include: { county: true } } } },
      season: true,
    },
    orderBy: [
      { roomType: { hotel: { county: { name: 'asc' } } } },
      { roomType: { hotel: { stars: 'desc' } } },
      { roomType: { hotel: { name: 'asc' } } },
    ],
    take: 200,
  });

  return NextResponse.json(prices);
}
