// app/api/vouchers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    include: {
      booking: { include: { client: true } },
      property: true,
      vehicle: true,
      createdBy: true,
    },
  });
  if (!voucher) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(voucher);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const voucher = await prisma.voucher.update({
      where: { id: params.id },
      data: {
        status: body.status,
        bookingStatus: body.bookingStatus,
        remarks: body.remarks,
        roomType: body.roomType,
        numAdults: body.numAdults !== undefined ? Number(body.numAdults) : undefined,
        numChildren: body.numChildren !== undefined ? Number(body.numChildren) : undefined,
        numTwins: body.numTwins !== undefined ? Number(body.numTwins) : undefined,
        numDoubles: body.numDoubles !== undefined ? Number(body.numDoubles) : undefined,
        numSingles: body.numSingles !== undefined ? Number(body.numSingles) : undefined,
        numTriples: body.numTriples !== undefined ? Number(body.numTriples) : undefined,
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
        numNights: body.numNights !== undefined ? Number(body.numNights) : undefined,
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : undefined,
        dropoffDate: body.dropoffDate ? new Date(body.dropoffDate) : undefined,
        pickupLocation: body.pickupLocation,
        route: body.route,
        rateKES: body.rateKES !== undefined ? Number(body.rateKES) : undefined,
      },
    });
    return NextResponse.json(voucher);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.voucher.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
