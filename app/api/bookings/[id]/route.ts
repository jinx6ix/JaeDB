// app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tourPackage: { include: { days: { orderBy: { dayNumber: 'asc' } } } },
      assignedTo: true,
      vouchers: { include: { property: true, vehicle: true } },
      itinerary: { include: { days: { orderBy: { dayNumber: 'asc' } } } },
      invoices: true,
    },
  });

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: body.status,
        totalAmount: body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
        paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : undefined,
        notes: body.notes,
        specialRequirements: body.specialRequirements,
        assignedToId: body.assignedToId,
      },
    });
    return NextResponse.json(booking);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.booking.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
