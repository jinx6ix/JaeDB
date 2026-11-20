// app/api/safari-rates/hotels/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, description } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const current = await prisma.sRHotel.findUnique({ where: { id: Number(id) } });
  if (!current) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });

  const data: any = {};
  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const existing = await prisma.sRHotel.findFirst({
      where: { countyId: current.countyId, name: trimmed, id: { not: Number(id) } },
    });
    if (existing) return NextResponse.json({ error: 'A hotel with this name already exists in this destination' }, { status: 409 });
    data.name = trimmed;
  }
  if (description !== undefined) data.description = description || null;
  if (body.childFreeAge !== undefined) data.childFreeAge = body.childFreeAge == null ? null : Number(body.childFreeAge);
  if (body.childChargeAge !== undefined) data.childChargeAge = body.childChargeAge == null ? null : Number(body.childChargeAge);
  if (body.extraBedRate !== undefined) data.extraBedRate = body.extraBedRate == null ? null : Number(body.extraBedRate);

  const hotel = await prisma.sRHotel.update({
    where: { id: Number(id) },
    data,
    include: { county: true },
  });
  return NextResponse.json(hotel);
}
