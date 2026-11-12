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
  const { description } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const hotel = await prisma.sRHotel.update({
    where: { id: Number(id) },
    data: { description: description || null },
    include: { county: true },
  });
  return NextResponse.json(hotel);
}
