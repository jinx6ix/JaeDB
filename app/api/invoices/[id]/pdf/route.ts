// app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Image as PDFImage,
} from '@react-pdf/renderer';
import { readFileSync } from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let logoSrc: any = null;
try {
  const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
  const logoBuffer = readFileSync(logoPath);
  // Detect actual file type from magic bytes
  if (logoBuffer[0] === 0xFF && logoBuffer[1] === 0xD8 && logoBuffer[2] === 0xFF) {
    // JPEG: FF D8 FF
    logoSrc = { data: logoBuffer, format: 'jpeg' as const };
  } else if (logoBuffer[0] === 0x89 && logoBuffer[1] === 0x50 && logoBuffer[2] === 0x4E && logoBuffer[3] === 0x47) {
    // PNG: 89 50 4E 47
    logoSrc = { data: logoBuffer, format: 'png' as const };
  } else if (logoBuffer[0] === 0x52 && logoBuffer[1] === 0x49 && logoBuffer[2] === 0x46 && logoBuffer[3] === 0x46) {
    // WEBP: 52 49 46 46 ... 57 45 42 50
    logoSrc = { data: logoBuffer, format: 'png' as const };
  }
} catch (e) {}

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff', flexDirection: 'column' },
  header: { backgroundColor: '#1a1a2e', padding: '16 24', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#fb923c', fontSize: 9, marginTop: 2 },
  hero: { backgroundColor: '#f97316', padding: '10 24', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: '#ffffff', fontSize: 15, fontFamily: 'Helvetica-Bold' },
  heroRight: { alignItems: 'flex-end' },
  section: { padding: '10 24', borderBottom: '1 solid #f3f4f6' },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 5 },
  body: { fontSize: 9, color: '#4b5563', lineHeight: 1.5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  tHead: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottom: '1 solid #e5e7eb', paddingVertical: 5 },
  tRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', paddingVertical: 5 },
  tCell: { fontSize: 8, color: '#374151', paddingHorizontal: 6, flex: 1 },
  tCellHd: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, flex: 1 },
  tCellRight: { fontSize: 8, color: '#374151', paddingHorizontal: 6, flex: 1, textAlign: 'right' },
  tCellHdRight: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, flex: 1, textAlign: 'right' },
  footer: { backgroundColor: '#f9fafb', padding: '10 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerTxt: { fontSize: 8, color: '#6b7280' },
  footerBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  pageNum: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4, fontSize: 8, color: '#9ca3af', textAlign: 'right' },
  statusBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  statusDraft: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  statusSent: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  statusPartial: { backgroundColor: '#fef3c7', color: '#d97706' },
  statusPaid: { backgroundColor: '#d1fae5', color: '#059669' },
  statusOverdue: { backgroundColor: '#fee2e2', color: '#dc2626' },
  statusCancelled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  totTable: { marginTop: 10, alignSelf: 'flex-end', width: 220 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  totLabel: { fontSize: 9, color: '#6b7280' },
  totValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: '#f97316' },
  paymentBox: { backgroundColor: '#fffbeb', border: '1 solid #fde68a', borderRadius: 4, padding: 10, marginTop: 10 },
  paymentLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#d97706', marginBottom: 4 },
  paymentText: { fontSize: 9, color: '#374151', fontFamily: 'Helvetica' },
  notesBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginTop: 10 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#374151' },
  perCostBox: { flexDirection: 'row', gap: 40, alignItems: 'flex-start' },
  perCostItem: { flex: 1 },
  perCostLabel: { fontSize: 9, color: '#6b7280' },
  perCostValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#f97316' },
  perCostGrand: { flex: 1 },
  perCostGrandValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },
});

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmt2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseLineItems(raw: string | any[]): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function parseDayRows(raw: unknown): any[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function parseExtras(raw: unknown): any[] {
  if (!raw) return [];
  let parsed = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'DRAFT': return S.statusDraft;
    case 'SENT': return S.statusSent;
    case 'PARTIAL': return S.statusPartial;
    case 'PAID': return S.statusPaid;
    case 'OVERDUE': return S.statusOverdue;
    case 'CANCELLED': return S.statusCancelled;
    default: return S.statusDraft;
  }
}

function InvoicePDF({ invoice }: { invoice: any }) {
  const lineItems = parseLineItems(invoice.lineItems);
  const balanceDue = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
  const isOverdue = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate) < new Date();
  const statusStyle = getStatusStyle(invoice.status);
  const currency = invoice.currency || 'USD';

  const hasCostSheet = !!invoice.costSheet;
  const numAdults = hasCostSheet ? (Number(invoice.costSheet.numAdults) || 1) : 1;
  const numChildren = hasCostSheet ? (Number(invoice.costSheet.numChildren) || 0) : 0;
  const numPax = numAdults + numChildren;
  const markupPercent = hasCostSheet ? (Number(invoice.costSheet.markupPercent) || 10) : 10;

  const perAdultCost = hasCostSheet ? (Number(invoice.costSheet.perAdultCost) || 0) : 0;
  const perChildCost = hasCostSheet ? (Number(invoice.costSheet.perChildCost) || 0) : 0;
  const grandTotal = hasCostSheet ? (Number(invoice.costSheet.totalCost) || 0) : (invoice.totalAmount || 0);

  const dayRows = hasCostSheet ? parseDayRows(invoice.costSheet.dayRows) : [];
  const extras = hasCostSheet ? parseExtras(invoice.costSheet.extras) : [];

  let accomGroup = 0, parkGroup = 0, transportGroup = 0, flightGroup = 0;
  dayRows.forEach((row: any) => {
    accomGroup += ((row.adultAccomTotal || 0) * numAdults) + ((row.childAccomTotal || 0) * numChildren);
    parkGroup += (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
    transportGroup += row.transportTotal || 0;
    if (row.hasFlight) {
      flightGroup += ((row.flightAdultPP || 0) * numAdults) + ((row.flightChildPP || 0) * numChildren);
    }
  });

  let extrasTotal = 0;
  if (hasCostSheet) {
    extrasTotal =
      (invoice.costSheet.fileHandlingFee || 0) +
      (invoice.costSheet.ecoBottle || 0) +
      (invoice.costSheet.evacInsurance || 0) +
      (invoice.costSheet.arrivalTransfer || 0) +
      (invoice.costSheet.departureTransfer || 0) +
      (invoice.costSheet.maasaiVillage ? (invoice.costSheet.maasaiCost || 0) : 0);
  }
  extras.forEach((e: any) => { extrasTotal += Number(e.cost) || 0; });

  const storedSubtotal = hasCostSheet ? (Number(invoice.costSheet.subtotal) || 0) : (invoice.subtotal || 0);
  const storedMarkup = hasCostSheet ? (Number(invoice.costSheet.markupAmount) || 0) : 0;

  // Build bill-to section
  const billToSection = [
    React.createElement(Text, { key: 'bt1', style: S.sectionTitle }, 'Bill To'),
    React.createElement(Text, { key: 'bt2', style: S.body }, invoice.billTo),
    invoice.billToEmail && React.createElement(Text, { key: 'bt3', style: S.body }, invoice.billToEmail),
    invoice.billToPhone && React.createElement(Text, { key: 'bt4', style: S.body }, invoice.billToPhone),
  ];

  // Build right section (booking/client)
  let rightSection: any = null;
  if (invoice.booking) {
    rightSection = [
      React.createElement(Text, { key: 'rs1', style: S.sectionTitle }, 'Booking Reference'),
      React.createElement(Text, { key: 'rs2', style: [S.body, S.bold] }, invoice.booking.bookingRef),
      React.createElement(Text, { key: 'rs3', style: S.body }, invoice.booking.client?.name),
      invoice.booking.tourPackage && React.createElement(Text, { key: 'rs4', style: S.body }, invoice.booking.tourPackage.title),
    ];
  } else if (invoice.client) {
    rightSection = [
      React.createElement(Text, { key: 'rs1', style: S.sectionTitle }, 'Client'),
      React.createElement(Text, { key: 'rs2', style: [S.body, S.bold] }, invoice.client.name),
      invoice.client.email && React.createElement(Text, { key: 'rs3', style: S.body }, invoice.client.email),
      invoice.client.agent && React.createElement(Text, { key: 'rs4', style: S.body }, 'Agent: ' + invoice.client.agent.name),
    ];
  }

  // Build cost sheet day rows
  const dayRowEls: any[] = dayRows.map((row: any, i: number) => {
    const aG = ((row.adultAccomTotal || 0) * numAdults) + ((row.childAccomTotal || 0) * numChildren);
    const park = (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0);
    const trans = row.transportTotal || 0;
    return React.createElement(View, { key: i, style: S.tRow },
      React.createElement(Text, { style: [S.tCell, { flex: 0.5 }] }, String(i + 1)),
      React.createElement(Text, { style: [S.tCell, { flex: 1.5 }] }, row.destinationName || '—'),
      React.createElement(Text, { style: [S.tCell, { flex: 1.5 }] }, row.hotelName || '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${currency} ${fmt2(aG)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${currency} ${fmt2(park)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${currency} ${fmt2(trans)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, row.hasFlight ? 'Yes' : '—'),
    );
  });

  // Build cost sheet breakdown totals
  const breakdownTotals = [
    React.createElement(View, { key: 'bt1', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Accommodation'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(accomGroup)}`),
    ),
    React.createElement(View, { key: 'bt2', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Park Fees'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(parkGroup)}`),
    ),
    React.createElement(View, { key: 'bt3', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Transport'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(transportGroup)}`),
    ),
  ];
  if (flightGroup > 0) {
    breakdownTotals.push(React.createElement(View, { key: 'bt4', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Flights'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(flightGroup)}`),
    ));
  }
  if (extrasTotal > 0) {
    breakdownTotals.push(React.createElement(View, { key: 'bt5', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Fees & Extras'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(extrasTotal)}`),
    ));
  }
  breakdownTotals.push(
    React.createElement(View, { key: 'bt6', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Subtotal'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(storedSubtotal)}`),
    ),
    React.createElement(View, { key: 'bt7', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, `Markup (${markupPercent}%)`),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(storedMarkup)}`),
    ),
    React.createElement(View, { key: 'bt8', style: S.totFinal },
      React.createElement(Text, { style: { ...S.totLabel, fontFamily: 'Helvetica-Bold' } }, 'Grand Total'),
      React.createElement(Text, { style: { ...S.totValue, fontSize: 11 } }, `${currency} ${fmt2(grandTotal)}`),
    ),
  );

  // Per adult / per child pricing section
  const pricingSection = [
    React.createElement(View, { key: 'ps0', style: S.perCostBox },
      numChildren > 0
        ? React.createElement(View, { key: 'pc', style: S.perCostItem },
            React.createElement(Text, { style: S.perCostLabel }, 'Per Child Cost'),
            React.createElement(Text, { style: S.perCostValue }, `${currency} ${fmt2(perChildCost)}`),
          )
        : null,
      React.createElement(View, { key: 'pa', style: S.perCostItem },
        React.createElement(Text, { style: S.perCostLabel }, 'Per Adult Cost'),
        React.createElement(Text, { style: S.perCostValue }, `${currency} ${fmt2(perAdultCost)}`),
      ),
      React.createElement(View, { key: 'gt', style: S.perCostGrand },
        React.createElement(Text, { style: S.perCostLabel }, `Group Total (${numPax} pax)`),
        React.createElement(Text, { style: S.perCostGrandValue }, `${currency} ${fmt2(grandTotal)}`),
      ),
      balanceDue > 0
        ? React.createElement(View, { key: 'bd', style: S.perCostItem },
            React.createElement(Text, { style: S.perCostLabel }, 'Balance Due'),
            React.createElement(Text, { style: { ...S.perCostValue, color: isOverdue ? '#dc2626' : '#d97706' } }, `${currency} ${fmt2(Math.max(0, balanceDue))}`),
          )
        : null,
    ),
  ];

  // Line items (when no cost sheet)
  const lineItemEls = lineItems.map((item: any, i: number) =>
    React.createElement(View, { key: i, style: S.tRow },
      React.createElement(Text, { style: [S.tCell, { flex: 3 }] }, item.description || item.name || 'Item'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, String(item.quantity || 1)),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${currency} ${fmt2(item.unitPrice || 0)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 1 }] }, `${currency} ${fmt2(item.total || item.quantity * item.unitPrice)}`),
    )
  );

  const lineItemTotals = [
    React.createElement(View, { key: 'lit1', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Subtotal'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(invoice.subtotal)}`),
    ),
    invoice.taxAmount > 0 && React.createElement(View, { key: 'lit2', style: S.totRow },
      React.createElement(Text, { style: S.totLabel }, 'Tax'),
      React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(invoice.taxAmount)}`),
    ),
    React.createElement(View, { key: 'lit3', style: S.totFinal },
      React.createElement(Text, { style: { ...S.totLabel, fontFamily: 'Helvetica-Bold' } }, 'Total Amount'),
      React.createElement(Text, { style: { ...S.totValue, fontSize: 11 } }, `${currency} ${fmt2(invoice.totalAmount)}`),
    ),
  ];

  // Cost sheet header row
  const costSheetHeaderRow = [
    React.createElement(Text, { style: [S.tCellHd, { flex: 0.5 }], key: 'h0' }, 'Day'),
    React.createElement(Text, { style: [S.tCellHd, { flex: 1.5 }], key: 'h1' }, 'Destination'),
    React.createElement(Text, { style: [S.tCellHd, { flex: 1.5 }], key: 'h2' }, 'Hotel'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }], key: 'h3' }, 'Accom'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }], key: 'h4' }, 'Park'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }], key: 'h5' }, 'Transport'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }], key: 'h6' }, 'Flight'),
  ];

  return React.createElement(Document, { title: `Invoice ${invoice.invoiceNo}` },
    React.createElement(Page, { size: 'A4', style: S.page },

      // Header
      React.createElement(View, { style: S.header },
        React.createElement(View, { style: S.headerLeft },
          logoSrc
            ? React.createElement(PDFImage, { key: 'logo', style: { width: 44, height: 44, borderRadius: 22 }, src: logoSrc })
            : React.createElement(View, { key: 'logo', style: { width: 44, height: 44, backgroundColor: '#f97316', borderRadius: 22, alignItems: 'center', justifyContent: 'center' } },
                React.createElement(Text, { style: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' } }, 'JT'),
              ),
          React.createElement(View, null,
            React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
            React.createElement(Text, { style: S.headerSub }, 'info@jaetravel.co.ke  ·  +254 726 485228'),
          ),
        ),
        React.createElement(View, { style: S.headerRight },
          React.createElement(Text, { style: { color: '#9ca3af', fontSize: 8 } }, fmt(invoice.invoiceDate)),
        ),
      ),

      // Hero
      React.createElement(View, { style: S.hero },
        React.createElement(Text, { style: S.heroTitle }, `INVOICE  ${invoice.invoiceNo}`),
        React.createElement(View, { style: S.heroRight },
          React.createElement(View, { style: { ...S.statusBadge, ...statusStyle } },
            React.createElement(Text, null, invoice.status),
          ),
          isOverdue && React.createElement(View, { style: S.statusOverdue },
            React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#dc2626' } }, 'OVERDUE'),
          ),
        ),
      ),

      // Bill To + Booking/Client + Due date
      React.createElement(View, { style: S.section },
        React.createElement(View, { style: { flexDirection: 'row', gap: 40 } },
          React.createElement(View, { style: { flex: 1 } }, ...billToSection),
          rightSection ? React.createElement(View, { style: { flex: 1 } }, ...rightSection) : null,
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Details'),
            React.createElement(Text, { style: S.body }, 'Due: ' + fmt(invoice.dueDate)),
          ),
        ),
      ),

      // Cost Sheet Breakdown (if linked)
      hasCostSheet && dayRows.length > 0 && React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, (invoice.costSheet.tourTitle || 'Tour Package') + ' — Cost Breakdown'),
        React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', marginBottom: 6 } },
          `${invoice.costSheet.days} days · ${numAdults}A${numChildren > 0 ? ' + ' + numChildren + 'C' : ''} · ${invoice.costSheet.boardBasis || 'FB'} board · ${currency}`,
        ),
        React.createElement(View, { style: S.tHead }, ...costSheetHeaderRow),
        ...dayRowEls,
        React.createElement(View, { style: S.totTable }, ...breakdownTotals),
      ),

      // Line Items (standalone invoices without cost sheet)
      !hasCostSheet && lineItems.length > 0 && React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Invoice Items'),
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { flex: 3 }] }, 'Description'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Qty'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Unit Price'),
          React.createElement(Text, { style: [S.tCellHdRight, { flex: 1 }] }, 'Total'),
        ),
        ...lineItemEls,
        React.createElement(View, { style: S.totTable }, ...lineItemTotals),
      ),

      // Per Adult / Per Child pricing section
      ...(hasCostSheet ? pricingSection : []),

      // Payment Instructions
      invoice.paymentInstructions && React.createElement(View, { style: S.paymentBox },
        React.createElement(Text, { style: S.paymentLabel }, 'Payment Instructions'),
        React.createElement(Text, { style: S.paymentText }, invoice.paymentInstructions),
      ),

      // Notes
      invoice.notes && React.createElement(View, { style: S.notesBox },
        React.createElement(Text, { style: S.notesLabel }, 'Notes'),
        React.createElement(Text, { style: S.notesText }, invoice.notes),
      ),

      // Footer
      React.createElement(View, { style: S.footer },
        React.createElement(View, { style: S.footerLeft },
          React.createElement(Text, { style: S.footerBold }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.footerTxt }, 'info@jaetravel.co.ke  ·  www.jaetravel.co.ke'),
        ),
        React.createElement(View, { style: S.footerRight },
          React.createElement(Text, { style: { ...S.footerTxt, fontFamily: 'Helvetica-Bold' } }, invoice.invoiceNo),
        ),
      ),
      React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
    )
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      booking: { include: { client: true, tourPackage: true } },
      client: { include: { agent: true } },
      costSheet: true,
    },
  });

  if (!invoice) return new NextResponse('Not found', { status: 404 });

  try {
    const buffer = await renderToBuffer(InvoicePDF({ invoice }) as any);
    const filename = `Invoice_${invoice.invoiceNo}.pdf`;
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (e: any) {
    console.error('Invoice PDF generation error:', e);
    return new NextResponse(`PDF generation failed: ${e.message}`, { status: 500 });
  }
}