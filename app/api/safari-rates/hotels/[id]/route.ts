import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const hotelId = Number(id);
  const body = await req.json();
  const { name, countyId } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Hotel name is required' }, { status: 400 });
  }

  const hotel = await prisma.sRHotel.findUnique({ where: { id: hotelId }, include: { county: true } });
  if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

  // Determine target county
  let targetCountyId = hotel.countyId;
  if (countyId != null) {
    targetCountyId = Number(countyId);
  }

  // Check unique constraint on (countyId, name) — avoid clashing with existing hotel in target county
  if (targetCountyId !== hotel.countyId || name.trim() !== hotel.name) {
    const existing = await prisma.sRHotel.findFirst({
      where: { countyId: targetCountyId, name: name.trim() },
    });
    if (existing && existing.id !== hotelId) {
      return NextResponse.json({ error: 'A hotel with this name already exists in this destination' }, { status: 409 });
    }
  }

  const updated = await prisma.sRHotel.update({
    where: { id: hotelId },
    data: {
      name: name.trim(),
      ...(targetCountyId !== hotel.countyId ? { countyId: targetCountyId } : {}),
    },
    include: { county: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const hotelId = Number(id);

  try {
    await prisma.sRHotel.delete({ where: { id: hotelId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE hotel error:', error);
    return NextResponse.json({ error: 'Failed to delete hotel' }, { status: 500 });
  }
}
