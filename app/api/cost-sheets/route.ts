// app/api/cost-sheets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId  = searchParams.get('clientId');
  const bookingId = searchParams.get('bookingId');
  const agentId   = searchParams.get('agentId');

  const sheets = await prisma.costSheet.findMany({
    where: {
      ...(clientId  ? { clientId }  : {}),
      ...(bookingId ? { bookingId } : {}),
      ...(agentId   ? { agentId }   : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      client:  { select: { id: true, name: true } },
      booking: { select: { id: true, bookingRef: true } },
      agent:   { select: { id: true, name: true, company: true } },
    },
  });
  return NextResponse.json(sheets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const sheet = await prisma.costSheet.create({
      data: {
        bookingId:        body.bookingId        || null,
        clientId:         body.clientId         || null,
        agentId:          body.agentId          || null,
        bookingRef:       body.bookingRef        || null,
        tourTitle:        body.tourTitle,
        days:             Number(body.days),
        numAdults:        Number(body.numAdults)   || 1,
        numChildren:      Number(body.numChildren) || 0,
        numPax:           Number(body.numPax),
        boardBasis:       body.boardBasis        || 'FB',
        currency:         body.currency          || 'USD',
        dayRows:          JSON.stringify(body.dayRows || []),
        fileHandlingFee:  Number(body.fileHandlingFee)  || 0,
        ecoBottle:        Number(body.ecoBottle)        || 0,
        evacInsurance:    Number(body.evacInsurance)    || 0,
        arrivalTransfer:  Number(body.arrivalTransfer)  || 0,
        departureTransfer:Number(body.departureTransfer)|| 0,
        flightCostPP:     Number(body.flightCostPP)     || 0,
        extras:           body.extras ? JSON.stringify(body.extras) : null,
        maasaiVillage:    Boolean(body.maasaiVillage),
        maasaiCost:       Number(body.maasaiCost) || 0,
        subtotal:         Number(body.subtotal),
        markupPercent:    Number(body.markupPercent) || 10,
        markupAmount:     Number(body.markupAmount),
        totalCost:        Number(body.totalCost),
        perAdultCost:     Number(body.perAdultCost),
        perChildCost:     Number(body.perChildCost) || 0,
        notes:            body.notes || null,
      },
      include: {
        client:  { select: { id: true, name: true } },
        booking: { select: { id: true, bookingRef: true } },
      },
    });
    return NextResponse.json(sheet, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
