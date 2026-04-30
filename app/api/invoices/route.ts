// app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function genInvoiceNo() {
  const y = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}-${rand}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');
  const clientId  = searchParams.get('clientId');
  const status    = searchParams.get('status');

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(bookingId ? { bookingId } : {}),
      ...(status    ? { status }    : {}),
      ...(clientId  ? { booking: { clientId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      booking: {
        include: { client: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // Auto-generate invoice number
    let invoiceNo = body.invoiceNo;
    if (!invoiceNo) {
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const candidate = genInvoiceNo();
        const existing = await prisma.invoice.findUnique({ where: { invoiceNo: candidate } });
        if (!existing) { invoiceNo = candidate; break; }
        attempts++;
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        bookingId:           body.bookingId,
        billTo:              body.billTo,
        billToEmail:         body.billToEmail         || null,
        billToPhone:         body.billToPhone         || null,
        invoiceDate:         body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
        dueDate:             new Date(body.dueDate),
        lineItems:           JSON.stringify(body.lineItems || []),
        subtotal:            Number(body.subtotal),
        taxAmount:           Number(body.taxAmount)    || 0,
        depositReceived:     Number(body.depositReceived) || 0,
        totalAmount:         Number(body.totalAmount),
        amountPaid:          Number(body.amountPaid)   || 0,
        currency:            body.currency             || 'USD',
        paymentInstructions: body.paymentInstructions  || null,
        notes:               body.notes                || null,
        status:              body.status               || 'DRAFT',
      },
      include: { booking: { include: { client: true } } },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
