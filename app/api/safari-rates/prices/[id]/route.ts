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
  const priceId = Number(id);
  const body = await req.json();

  // Fetch existing price with roomType to enforce maxOccupancy <= 2 rule
  const existing = await prisma.sRRoomPrice.findUnique({
    where: { id: priceId },
    include: { roomType: true },
  });
  if (!existing) return NextResponse.json({ error: 'Price not found' }, { status: 404 });

  try {
    const price = await prisma.sRRoomPrice.update({
      where: { id: priceId },
      data: {
        ratePerPersonSharing: body.ratePerPersonSharing != null ? Number(body.ratePerPersonSharing) : null,
        singleRoomRate:       body.singleRoomRate       != null ? Number(body.singleRoomRate)       : null,
        childRate:            body.childRate            != null ? Number(body.childRate)            : null,
        thirdAdultRate:       existing.roomType.maxOccupancy > 2 && body.thirdAdultRate != null ? Number(body.thirdAdultRate) : null,
        currency:             body.currency || 'USD',
        boardBasis:           body.boardBasis || undefined,
      },
      include: {
        roomType: { include: { hotel: { include: { county: true } } } },
        season: true,
      },
    });
    return NextResponse.json(price);
  } catch (error: any) {
    console.error('PUT /api/safari-rates/prices/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const priceId = Number(id);

  try {
    await prisma.sRRoomPrice.delete({ where: { id: priceId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/safari-rates/prices/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 });
  }
}
