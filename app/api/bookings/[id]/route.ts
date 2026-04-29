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
      costSheets: { select: { id: true, isOutdated: true } },
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
    const bookingId = params.id;

    // Fetch current booking to compare changes
    const oldBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!oldBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // 1. Update the booking itself
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: body.status,
        totalAmount: body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
        paidAmount: body.paidAmount !== undefined ? Number(body.paidAmount) : undefined,
        notes: body.notes,
        specialRequirements: body.specialRequirements,
        assignedToId: body.assignedToId,
        numAdults: body.numAdults,
        numChildren: body.numChildren,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        tourPackageId: body.tourPackageId,
        isResident: body.isResident,
      },
    });

    const paxChanged = oldBooking.numAdults !== body.numAdults || oldBooking.numChildren !== body.numChildren;
    const datesChanged = oldBooking.startDate.toISOString() !== new Date(body.startDate).toISOString() ||
                         oldBooking.endDate.toISOString() !== new Date(body.endDate).toISOString();

    // 2. Update Vouchers (pax only)
    if (paxChanged && body.numAdults !== undefined && body.numChildren !== undefined) {
      await prisma.voucher.updateMany({
        where: { bookingId: bookingId },
        data: {
          numAdults: body.numAdults,
          numChildren: body.numChildren,
        },
      });
    }

    // 3. Mark CostSheets as outdated (if any exist)
    if (paxChanged || datesChanged) {
      await prisma.costSheet.updateMany({
        where: { bookingId: bookingId },
        data: { isOutdated: true },
      });
    }

    // 4. Shift itinerary day dates if dates changed and an itinerary exists
    if (datesChanged) {
      const itinerary = await prisma.itinerary.findUnique({
        where: { bookingId: bookingId },
        include: { days: true },
      });
      if (itinerary && itinerary.days.length > 0) {
        const newStartDate = new Date(body.startDate);
        for (const day of itinerary.days) {
          const newDate = new Date(newStartDate);
          newDate.setDate(newStartDate.getDate() + (day.dayNumber - 1));
          await prisma.itineraryDay.update({
            where: { id: day.id },
            data: { date: newDate },
          });
        }
      }
    }

    return NextResponse.json(updatedBooking);
  } catch (e: any) {
    console.error('PATCH /api/bookings/[id] error:', e);
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