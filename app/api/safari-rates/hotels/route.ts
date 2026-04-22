import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hotels = await prisma.sRHotel.findMany({
    orderBy: [{ county: { name: 'asc' } }, { stars: 'desc' }, { name: 'asc' }],
    include: { county: true, _count: { select: { roomTypes: true } } },
  });
  return NextResponse.json(hotels);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const hotel = await prisma.sRHotel.create({
    data: { countyId: Number(body.countyId), name: body.name, stars: body.stars ? Number(body.stars) : null, category: body.category || null },
    include: { county: true },
  });
  return NextResponse.json(hotel, { status: 201 });
}
