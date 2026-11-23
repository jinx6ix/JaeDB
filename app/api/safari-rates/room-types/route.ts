import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');

  try {
    const rooms = await prisma.sRRoomType.findMany({
      where: hotelId ? { hotelId: Number(hotelId) } : undefined,
      include: { hotel: { include: { county: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error('GET /room-types error:', error);
    // Return empty array on error to avoid UI crash
    return NextResponse.json([]);
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

// Add this DELETE export to your existing file
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    await prisma.sRRoomType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE room-type error:', error);
    return NextResponse.json({ error: 'Failed to delete room type' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, name, maxOccupancy } = body;
  if (!id || !name) {
    return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
  }

  const updated = await prisma.sRRoomType.update({
    where: { id: Number(id) },
    data: { name: name.trim(), maxOccupancy: maxOccupancy ? Number(maxOccupancy) : undefined },
  });
  return NextResponse.json(updated);
}
