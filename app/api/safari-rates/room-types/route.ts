import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const rooms = await prisma.sRRoomType.findMany({
    where: hotelId ? { hotelId: Number(hotelId) } : undefined,
    include: { hotel: { include: { county: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const room = await prisma.sRRoomType.create({
    data: { hotelId: Number(body.hotelId), name: body.name, maxOccupancy: Number(body.maxOccupancy) || 2 },
  });
  return NextResponse.json(room, { status: 201 });
}
