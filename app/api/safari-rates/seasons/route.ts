import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const seasons = await prisma.sRSeason.findMany({
    where: hotelId ? { hotelId: Number(hotelId) } : undefined,
    include: { hotel: { include: { county: true } } },
    orderBy: [{ hotel: { name: 'asc' } }, { startDate: 'asc' }],
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const season = await prisma.sRSeason.create({
    data: { hotelId: Number(body.hotelId), name: body.name, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
  });
  return NextResponse.json(season, { status: 201 });
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
    await prisma.sRSeason.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE season error:', error);
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
  }
}
