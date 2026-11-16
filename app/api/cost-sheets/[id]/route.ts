// app/api/cost-sheets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sheet = await prisma.costSheet.findUnique({
    where: { id },
    include: {
      client:  true,
      booking: { include: { client: true } },
      agent:   true,
    },
  });
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(sheet);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.costSheet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
// Add to existing file, after DELETE
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const sheet = await prisma.costSheet.update({
      where: { id },
      data: {
        bookingId:        body.bookingId        || null,
        clientId:         body.clientId         || null,
        agentId:          body.agentId          || null,
        bookingRef:       body.bookingRef       || null,
        tourTitle:        body.tourTitle,
        days:             Number(body.days),
        numAdults:        Number(body.numAdults)   || 1,
        numChildren:      Number(body.numChildren) || 0,
        numPax:           Number(body.numPax),
        boardBasis:       body.boardBasis        || 'FB',
        currency:         body.currency          || 'USD',
        dayRows:          body.dayRows,          // already JSON string or object
        fileHandlingFee:  Number(body.fileHandlingFee)  || 0,
        ecoBottle:        Number(body.ecoBottle)        || 0,
        evacInsurance:    Number(body.evacInsurance)    || 0,
        arrivalTransfer:  Number(body.arrivalTransfer)  || 0,
        departureTransfer:Number(body.departureTransfer)|| 0,
        extras:           body.extras,           // JSON string or object
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
    });
    return NextResponse.json(sheet);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
