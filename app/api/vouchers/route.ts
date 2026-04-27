// app/api/vouchers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateVoucherNo } from '@/lib/rates';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const vouchers = await prisma.voucher.findMany({
    where: q ? {
      OR: [
        { voucherNo: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { hotelName:  { contains: q, mode: 'insensitive' } },
        { flightName: { contains: q, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { include: { client: true } },
      property: true,
      vehicle: true,
      createdBy: true,
    },
  });

  return NextResponse.json(vouchers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const userId = (session.user as any).id;

    // Generate voucher number — flights get F suffix e.g. JTE120726F
    const refDate = body.checkIn       ? new Date(body.checkIn)
                  : body.pickupDate    ? new Date(body.pickupDate)
                  : body.departureDate ? new Date(body.departureDate)
                  : new Date();

    const dd = String(refDate.getDate()).padStart(2, '0');
    const mm = String(refDate.getMonth() + 1).padStart(2, '0');
    const yy = String(refDate.getFullYear()).slice(-2);
    const dateStr = `${dd}${mm}${yy}`;

    let voucherNo: string;
    if (body.type === 'FLIGHT') {
      const existing = await prisma.voucher.count({
        where: { voucherNo: { contains: dateStr }, type: 'FLIGHT' },
      });
      voucherNo = existing === 0 ? `JTE${dateStr}F` : `JTE${dateStr}-${existing + 1}F`;
    } else {
      voucherNo = generateVoucherNo(refDate);
    }

    const voucher = await prisma.voucher.create({
      data: {
        voucherNo,
        type: body.type,
        bookingId: body.bookingId || null,
        clientId: body.clientId || null,
        agentId: body.agentId || null,
        propertyId: body.propertyId || null,
        vehicleId: body.vehicleId || null,
        createdById: userId,
        hotelName: body.hotelName || null,
        roomType: body.roomType || null,
        clientName: body.clientName || null,
        numAdults: body.numAdults ? Number(body.numAdults) : null,
        numChildren: body.numChildren !== undefined ? Number(body.numChildren) : null,
        numTwins: body.numTwins !== undefined ? Number(body.numTwins) : null,
        numDoubles: body.numDoubles !== undefined ? Number(body.numDoubles) : null,
        numSingles: body.numSingles !== undefined ? Number(body.numSingles) : null,
        numTriples: body.numTriples !== undefined ? Number(body.numTriples) : null,
        checkIn: body.checkIn ? new Date(body.checkIn) : null,
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        numNights: body.numNights ? Number(body.numNights) : null,
        vehicleName: body.vehicleName || null,
        vehicleType: body.vehicleType || null,
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
        dropoffDate: body.dropoffDate ? new Date(body.dropoffDate) : null,
        pickupLocation: body.pickupLocation || null,
        route: body.route || null,
        rateKES: body.rateKES ? Number(body.rateKES) : null,
        // Flight fields
        flightName: body.flightName || null,
        flightSchedule: body.flightSchedule || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        returnDate: body.returnDate ? new Date(body.returnDate) : null,
        numDays: body.numDays ? Number(body.numDays) : null,
        remarks: body.remarks || null,
        status: 'ACTIVE',
      },
      include: { property: true, vehicle: true, createdBy: true },
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (e: any) {
    console.error('Voucher create error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
