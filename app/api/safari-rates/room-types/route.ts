import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');

  if (!hotelId) {
    // Return empty array instead of crashing
    return NextResponse.json([]);
  }

  try {
    const rooms = await prisma.sRRoomType.findMany({
      where: { hotelId: Number(hotelId) },
      include: { hotel: { include: { county: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('GET /room-types error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – Admin only' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { hotelId, name, maxOccupancy } = body;

    if (!hotelId || !name) {
      return NextResponse.json({ error: 'hotelId and name are required' }, { status: 400 });
    }

    const room = await prisma.sRRoomType.create({
      data: {
        hotelId: Number(hotelId),
        name: name.trim(),
        maxOccupancy: maxOccupancy ? Number(maxOccupancy) : 2,
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    console.error('POST /room-types error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Room type already exists for this hotel' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create room type' }, { status: 500 });
  }
}
