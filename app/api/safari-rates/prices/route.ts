import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const prices = await prisma.sRRoomPrice.findMany({
    include: {
      roomType: { include: { hotel: { include: { county: true } } } },
      season: true,
    },
    orderBy: [{ roomType: { hotel: { county: { name: 'asc' } } } }, { roomType: { hotel: { name: 'asc' } } }],
  });
  return NextResponse.json(prices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const price = await prisma.sRRoomPrice.upsert({
    where: {
      roomTypeId_seasonId_boardBasis: {
        roomTypeId: Number(body.roomTypeId),
        seasonId:   Number(body.seasonId),
        boardBasis: body.boardBasis,
      },
    },
    update: {
      ratePerPersonSharing: body.ratePerPersonSharing ? Number(body.ratePerPersonSharing) : null,
      singleRoomRate:       body.singleRoomRate       ? Number(body.singleRoomRate)       : null,
      childRate:            body.childRate             ? Number(body.childRate)             : null,
      currency: body.currency || 'USD',
    },
    create: {
      roomTypeId:           Number(body.roomTypeId),
      seasonId:             Number(body.seasonId),
      boardBasis:           body.boardBasis,
      ratePerPersonSharing: body.ratePerPersonSharing ? Number(body.ratePerPersonSharing) : null,
      singleRoomRate:       body.singleRoomRate       ? Number(body.singleRoomRate)       : null,
      childRate:            body.childRate             ? Number(body.childRate)             : null,
      currency: body.currency || 'USD',
    },
  });
  return NextResponse.json(price, { status: 201 });
}
