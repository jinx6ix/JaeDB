// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { booking: { include: { client: { include: { agent: true } }, tourPackage: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        billTo:              body.billTo,
        billToEmail:         body.billToEmail         ?? undefined,
        billToPhone:         body.billToPhone         ?? undefined,
        invoiceDate:         body.invoiceDate ? new Date(body.invoiceDate) : undefined,
        dueDate:             body.dueDate ? new Date(body.dueDate) : undefined,
        lineItems:           body.lineItems ? JSON.stringify(body.lineItems) : undefined,
        subtotal:            body.subtotal  !== undefined ? Number(body.subtotal)  : undefined,
        taxAmount:           body.taxAmount !== undefined ? Number(body.taxAmount) : undefined,
        depositReceived:     body.depositReceived !== undefined ? Number(body.depositReceived) : undefined,
        totalAmount:         body.totalAmount !== undefined ? Number(body.totalAmount) : undefined,
        amountPaid:          body.amountPaid  !== undefined ? Number(body.amountPaid)  : undefined,
        currency:            body.currency   ?? undefined,
        paymentInstructions: body.paymentInstructions ?? undefined,
        notes:               body.notes      ?? undefined,
        status:              body.status     ?? undefined,
      },
    });
    return NextResponse.json(invoice);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
