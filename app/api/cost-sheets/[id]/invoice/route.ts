// app/api/cost-sheets/[id]/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function genInvoiceNo() {
  const y = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}-${rand}`;
}

function parseDayRows(raw: any): any[] {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function parseExtras(raw: any): any[] {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await req.json();
      } catch {
        // Empty or invalid JSON body - use empty object
        body = {};
      }
    }

    const costSheet = await prisma.costSheet.findUnique({
      where: { id },
      include: { client: true, agent: true, booking: true },
    });

    if (!costSheet) return NextResponse.json({ error: 'Cost sheet not found' }, { status: 404 });

    const dayRows = parseDayRows(costSheet.dayRows);
    const extras = parseExtras(costSheet.extras);

    const numAdults = Number(costSheet.numAdults) || 1;
    const numChildren = Number(costSheet.numChildren) || 0;
    const numPax = numAdults + numChildren;
    const markupPercent = Number(costSheet.markupPercent) || 10;

    // ── New spreadsheet methodology (per person) ──
    // Accommodation PPS is already per-person — sum directly, never divide by pax.
    const accommodationPpsTotal = dayRows.reduce((sum, row) => sum + (Number(row.adultAccomTotal) || 0), 0);
    const dailyExtrasTotal = dayRows.reduce((sum, row) => sum + (Number(row.extrasTotal) || 0), 0);

    // SRS handled separately: only when a single adult travels with a single-room rate.
    const srsTotal = numAdults === 1
      ? dayRows.reduce((sum, row) => sum + (Number(row.singleRoomRate) || 0), 0)
      : 0;

    let parkGroupTotal = 0;
    let transportGroupTotal = 0;
    let flightGroupTotal = 0;
    dayRows.forEach((row: any) => {
      parkGroupTotal += Number(row.parkFeeAdultTotal || 0) + Number(row.parkFeeChildTotal || 0);
      transportGroupTotal += Number(row.transportTotal || 0);
      if (row.hasFlight) {
        flightGroupTotal += (Number(row.flightAdultPP || 0) * numAdults) + (Number(row.flightChildPP || 0) * numChildren);
      }
    });

    let extrasTotal =
      Number(costSheet.fileHandlingFee || 0) +
      Number(costSheet.ecoBottle || 0) +
      Number(costSheet.evacInsurance || 0) +
      Number(costSheet.arrivalTransfer || 0) +
      Number(costSheet.departureTransfer || 0) +
      (costSheet.maasaiVillage ? Number(costSheet.maasaiCost || 0) : 0);
    extras.forEach((e: any) => { extrasTotal += Number(e.cost) || 0; });

    // Transport is a group expense: divide by pax for per-person allocation.
    const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;

    // Per-person base (spreadsheet methodology)
    const basePps = accommodationPpsTotal + parkGroupTotal + transportPerPax + dailyExtrasTotal + extrasTotal + srsTotal;
    const perPersonMarkup = basePps * (markupPercent / 100);
    const perPersonFinal = basePps + perPersonMarkup;

    // Invoice totals are group totals (per-person final × pax).
    const subtotal = basePps * numPax;
    const totalMarkup = perPersonMarkup * numPax;
    const totalAmount = perPersonFinal * numPax;
    const perAdultCost = perPersonFinal;
    const perChildCost = perPersonFinal * 0.5;

    // Build line items using group totals consistent with the new calculation
    const items: any[] = [];

    const accomLineTotal = (numAdults === 1 && srsTotal > 0 ? srsTotal : accommodationPpsTotal * numAdults);
    const transportLinePerPax = transportPerPax;
    const transportLineTotal = transportGroupTotal;

    if (accomLineTotal > 0) {
      items.push({
        description: `Accommodation (${costSheet.days} days, ${numAdults}A${numChildren > 0 ? ` + ${numChildren}C` : ''})`,
        quantity: 1,
        unitPrice: accomLineTotal,
        total: accomLineTotal,
      });
    }

    if (parkGroupTotal > 0) {
      items.push({
        description: `Park Fees (${costSheet.days} days, ${numAdults}A${numChildren > 0 ? ` + ${numChildren}C` : ''})`,
        quantity: 1,
        unitPrice: parkGroupTotal,
        total: parkGroupTotal,
      });
    }

    if (transportLineTotal > 0) {
      items.push({
        description: `Transport (${costSheet.days} days, ${numPax} pax)`,
        quantity: numPax,
        unitPrice: transportLinePerPax,
        total: transportLineTotal,
      });
    }

    if (flightGroupTotal > 0) {
      items.push({
        description: `Flight Costs (${numAdults}A${numChildren > 0 ? ` + ${numChildren}C` : ''})`,
        quantity: 1,
        unitPrice: flightGroupTotal,
        total: flightGroupTotal,
      });
    }

    // Fixed costs / extras
    if (Number(costSheet.fileHandlingFee) > 0) {
      items.push({ description: 'File Handling Fee', quantity: 1, unitPrice: Number(costSheet.fileHandlingFee), total: Number(costSheet.fileHandlingFee) });
    }
    if (Number(costSheet.ecoBottle) > 0) {
      items.push({ description: 'Eco Steel Bottle + Mineral Water', quantity: 1, unitPrice: Number(costSheet.ecoBottle), total: Number(costSheet.ecoBottle) });
    }
    if (Number(costSheet.evacInsurance) > 0) {
      items.push({ description: 'Evacuation Insurance', quantity: 1, unitPrice: Number(costSheet.evacInsurance), total: Number(costSheet.evacInsurance) });
    }
    if (Number(costSheet.arrivalTransfer) > 0) {
      items.push({ description: 'Arrival Transfer', quantity: 1, unitPrice: Number(costSheet.arrivalTransfer), total: Number(costSheet.arrivalTransfer) });
    }
    if (Number(costSheet.departureTransfer) > 0) {
      items.push({ description: 'Departure Transfer', quantity: 1, unitPrice: Number(costSheet.departureTransfer), total: Number(costSheet.departureTransfer) });
    }
    if (costSheet.maasaiVillage) {
      items.push({ description: 'Maasai Village Visit', quantity: 1, unitPrice: Number(costSheet.maasaiCost) || 0, total: Number(costSheet.maasaiCost) || 0 });
    }

    // Add custom extras
    extras.forEach((extra: any) => {
      if (Number(extra.cost) > 0) {
        items.push({ description: extra.label || 'Extra Item', quantity: 1, unitPrice: Number(extra.cost), total: Number(extra.cost) });
      }
    });

    // If no items from day rows, use totalAmount as single line item
    if (items.length === 0) {
      items.push({
        description: `${costSheet.tourTitle || 'Safari Package'} - Total Cost`,
        quantity: 1,
        unitPrice: totalAmount,
        total: totalAmount,
      });
    }

    const markupAmount = totalMarkup;
    console.log('[Create Invoice] Subtotal:', subtotal, 'Markup:', markupAmount, 'Total:', totalAmount);
    console.log('[Create Invoice] Markup%:', markupPercent);

    // Generate invoice number
    let invoiceNo = genInvoiceNo();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.invoice.findUnique({ where: { invoiceNo } });
      if (!existing) break;
      invoiceNo = genInvoiceNo();
      attempts++;
    }

    // Determine due date (30 days from now by default)
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        bookingId: costSheet.bookingId || null,
        clientId: costSheet.clientId || null,
        costSheetId: costSheet.id,
        billTo: costSheet.client?.name || body.billTo || 'Client',
        billToEmail: costSheet.client?.email || null,
        billToPhone: costSheet.client?.phone || null,
        invoiceDate: new Date(),
        dueDate,
        lineItems: JSON.stringify(items),
        subtotal,
        taxAmount: 0,
        depositReceived: 0,
        totalAmount,
        amountPaid: 0,
        currency: costSheet.currency || 'USD',
        paymentInstructions: body.paymentInstructions || 'Account Name: Jae Travel Expeditions Ltd\nAccount No.: 0730285271126\nBank Name: Equity Bank\nBranch: Ngong\nSwift: EQBLKENA',
        notes: `Generated from Cost Sheet: ${costSheet.tourTitle}`,
        status: 'DRAFT',
      },
      include: {
        booking: { include: { client: true } },
        client: true,
        costSheet: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e: any) {
    console.error('[Create Invoice from CostSheet] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}