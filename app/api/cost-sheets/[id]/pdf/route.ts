// app/api/cost-sheets/[id]/pdf/route.ts
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

let logoSrc: any = null;
try {
  const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
  const logoBuffer = readFileSync(logoPath);
  if (logoBuffer[0] === 0xFF && logoBuffer[1] === 0xD8 && logoBuffer[2] === 0xFF) {
    logoSrc = { data: logoBuffer, format: 'jpeg' as const };
  } else if (logoBuffer[0] === 0x89 && logoBuffer[1] === 0x50 && logoBuffer[2] === 0x4E && logoBuffer[3] === 0x47) {
    logoSrc = { data: logoBuffer, format: 'png' as const };
  } else if (logoBuffer[0] === 0x52 && logoBuffer[1] === 0x49 && logoBuffer[2] === 0x46 && logoBuffer[3] === 0x46) {
    logoSrc = { data: logoBuffer, format: 'png' as const };
  }
} catch (e) {}

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff', flexDirection: 'column' },
  header: { backgroundColor: '#1a1a2e', padding: '14 24', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  tRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', paddingVertical: 4 },
  tCell: { fontSize: 8, color: '#374151', paddingHorizontal: 5, flex: 1 },
  tCellHd: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, flex: 1 },
  tCellRight: { fontSize: 8, color: '#374151', paddingHorizontal: 5, flex: 1, textAlign: 'right' },
  tCellHdRight: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, flex: 1, textAlign: 'right' },
  footer: { backgroundColor: '#f9fafb', padding: '10 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerTxt: { fontSize: 8, color: '#6b7280' },
  footerBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  pageNum: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4, fontSize: 8, color: '#9ca3af', textAlign: 'right' },
  totTable: { marginTop: 10, alignSelf: 'flex-end', width: 240 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  totLabel: { fontSize: 9, color: '#6b7280' },
  totValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: '#f97316' },
  perCostBox: { flexDirection: 'row', gap: 30, alignItems: 'flex-start', marginTop: 8 },
  perCostItem: { flex: 1 },
  perCostLabel: { fontSize: 9, color: '#6b7280' },
  perCostValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#f97316' },
  perCostGrand: { flex: 1 },
  perCostGrandValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },
  notesBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginHorizontal: 24, marginTop: 8 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#374151' },
});

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmt2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function CostSheetPDF({ cs }: { cs: any }) {
  const dayRows = parseDayRows(cs.dayRows);
  const extras = parseExtras(cs.extras);
  const currency = cs.currency || 'USD';
  const numAdults = Number(cs.numAdults) || 1;
  const numChildren = Number(cs.numChildren) || 0;
  const numPax = numAdults + numChildren;
  const markupPercent = Number(cs.markupPercent) || 10;

  let accomPerPersonSum = 0;
  let parkGroupTotal = 0;
  let transportGroupTotal = 0;
  let flightGroupTotal = 0;
  let extrasTotal =
    (cs.fileHandlingFee || 0) +
    (cs.ecoBottle || 0) +
    (cs.evacInsurance || 0) +
    (cs.arrivalTransfer || 0) +
    (cs.departureTransfer || 0) +
    (cs.maasaiVillage ? (cs.maasaiCost || 0) : 0);
  extras.forEach((e: any) => { extrasTotal += Number(e.cost) || 0; });

  dayRows.forEach((row: any) => {
    const adultPP = Number(row.adultAccomTotal) || 0;
    const childPP = Number(row.childAccomTotal) || 0;
    const singleRate = Number(row.singleRoomRate) || 0;
    let accomGroup = 0;
    if (numAdults === 1 && singleRate > 0) {
      accomGroup = singleRate;
    } else if (numAdults > 1 && singleRate > 0) {
      accomGroup = adultPP * (numAdults - 1) + singleRate;
    } else {
      accomGroup = adultPP * numAdults + childPP * numChildren;
    }
    accomPerPersonSum += accomGroup / numPax;
    parkGroupTotal += Number(row.parkFeeAdultTotal || 0) + Number(row.parkFeeChildTotal || 0);
    transportGroupTotal += Number(row.transportTotal || 0);
    if (row.hasFlight) {
      flightGroupTotal += (Number(row.flightAdultPP) || 0) * numAdults + (Number(row.flightChildPP) || 0) * numChildren;
    }
  });

  const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;
  const subtotal = accomPerPersonSum + parkGroupTotal + transportPerPax + extrasTotal + flightGroupTotal;
  const markupAmount = subtotal * (markupPercent / 100);
  const grandTotal = subtotal + markupAmount;
  const perAdultCost = grandTotal;
  const perChildCost = perAdultCost * 0.5;

  const dayRowEls = dayRows.map((row: any, i: number) => {
    const adultPP = Number(row.adultAccomTotal) || 0;
    const childPP = Number(row.childAccomTotal) || 0;
    const singleRate = Number(row.singleRoomRate) || 0;
    let accomGroup = 0;
    if (numAdults === 1 && singleRate > 0) {
      accomGroup = singleRate;
    } else if (numAdults > 1 && singleRate > 0) {
      accomGroup = adultPP * (numAdults - 1) + singleRate;
    } else {
      accomGroup = adultPP * numAdults + childPP * numChildren;
    }
    const parkA = Number(row.parkFeeAdultTotal) || 0;
    const parkC = Number(row.parkFeeChildTotal) || 0;
    const transport = Number(row.transportTotal) || 0;
    const transportPP = numPax > 0 ? transport / numPax : 0;
    const flightA = row.hasFlight ? (Number(row.flightAdultPP) || 0) * numAdults : 0;
    const flightC = row.hasFlight ? (Number(row.flightChildPP) || 0) * numChildren : 0;
    const dayTotal = (accomGroup / numPax) + parkA + parkC + transportPP + flightA + flightC;

    return React.createElement(View, { key: i, style: S.tRow },
      React.createElement(Text, { style: [S.tCell, { flex: 0.4 }] }, String(i + 1)),
      React.createElement(Text, { style: [S.tCell, { flex: 1.2 }] }, row.destinationName || '—'),
      React.createElement(Text, { style: [S.tCell, { flex: 1.2 }] }, row.hotelName || '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.8 }] }, `${currency} ${fmt2(accomGroup / numPax)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.8 }] }, numChildren > 0 ? `${currency} ${fmt2(childPP * numChildren / numPax)}` : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.8 }] }, singleRate > 0 ? `${currency} ${fmt2(singleRate)}` : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.7 }] }, `${currency} ${fmt2(parkA)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.7 }] }, numChildren > 0 ? `${currency} ${fmt2(parkC)}` : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.7 }] }, `${currency} ${fmt2(transport)}`),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.5 }] }, row.hasFlight ? '✈' : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.7 }] }, row.hasFlight ? `${currency} ${fmt2(flightA)}` : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.7 }] }, row.hasFlight && numChildren > 0 ? `${currency} ${fmt2(flightC)}` : '—'),
      React.createElement(Text, { style: [S.tCellRight, { flex: 0.8 }] }, `${currency} ${fmt2(dayTotal)}`),
    );
  });

  const headerRow = [
    React.createElement(Text, { style: [S.tCellHd, { flex: 0.4 }], key: 'h0' }, 'Day'),
    React.createElement(Text, { style: [S.tCellHd, { flex: 1.2 }], key: 'h1' }, 'Destination'),
    React.createElement(Text, { style: [S.tCellHd, { flex: 1.2 }], key: 'h2' }, 'Hotel'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.8 }], key: 'h3' }, 'Accom/Adult'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.8 }], key: 'h4' }, 'Accom/Child'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.8 }], key: 'h5' }, 'Single Room'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.7 }], key: 'h6' }, 'Park Adult'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.7 }], key: 'h7' }, 'Park Child'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.7 }], key: 'h8' }, 'Transport'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.5 }], key: 'h9' }, 'Flight?'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.7 }], key: 'h10' }, 'Flight Adult'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.7 }], key: 'h11' }, 'Flight Child'),
    React.createElement(Text, { style: [S.tCellHdRight, { flex: 0.8 }], key: 'h12' }, 'Day Total'),
  ];

  const fixedExtras: any[] = [];
  if (cs.fileHandlingFee > 0) fixedExtras.push(React.createElement(Text, { key: 'fe1', style: S.body }, `File Handling: ${currency} ${fmt2(cs.fileHandlingFee)}`));
  if (cs.ecoBottle > 0) fixedExtras.push(React.createElement(Text, { key: 'fe2', style: S.body }, `Eco Bottle: ${currency} ${fmt2(cs.ecoBottle)}`));
  if (cs.evacInsurance > 0) fixedExtras.push(React.createElement(Text, { key: 'fe3', style: S.body }, `Evac Insurance: ${currency} ${fmt2(cs.evacInsurance)}`));
  if (cs.arrivalTransfer > 0) fixedExtras.push(React.createElement(Text, { key: 'fe4', style: S.body }, `Arrival Transfer: ${currency} ${fmt2(cs.arrivalTransfer)}`));
  if (cs.departureTransfer > 0) fixedExtras.push(React.createElement(Text, { key: 'fe5', style: S.body }, `Departure Transfer: ${currency} ${fmt2(cs.departureTransfer)}`));
  if (cs.maasaiVillage) fixedExtras.push(React.createElement(Text, { key: 'fe6', style: S.body }, `Maasai Village: ${currency} ${fmt2(cs.maasaiCost || 0)}`));
  extras.forEach((e: any, i: number) => { if (Number(e.cost) > 0) fixedExtras.push(React.createElement(Text, { key: `ex${i}`, style: S.body }, `${e.label || 'Extra'}: ${currency} ${fmt2(Number(e.cost))}`)); });

  return React.createElement(Document, { title: `Cost Sheet ${cs.id}` },
    React.createElement(Page, { size: 'A4', style: S.page },

      // Header
      React.createElement(View, { style: S.header },
        React.createElement(View, { style: S.headerLeft },
          logoSrc
            ? React.createElement(PDFImage, { key: 'logo', style: { width: 40, height: 40, borderRadius: 20 }, src: logoSrc })
            : React.createElement(View, { key: 'logo', style: { width: 40, height: 40, backgroundColor: '#f97316', borderRadius: 20, alignItems: 'center', justifyContent: 'center' } },
                React.createElement(Text, { style: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' } }, 'JT'),
              ),
          React.createElement(View, null,
            React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
            React.createElement(Text, { style: S.headerSub }, 'info@jaetravel.co.ke  ·  +254 726 485228'),
          ),
        ),
        React.createElement(View, { style: S.headerRight },
          React.createElement(Text, { style: { color: '#9ca3af', fontSize: 8 } }, fmt(cs.createdAt)),
        ),
      ),

      // Hero
      React.createElement(View, { style: S.hero },
        React.createElement(Text, { style: S.heroTitle }, `COST SHEET  ${cs.id?.slice(-8).toUpperCase()}`),
        React.createElement(View, { style: S.heroRight },
          React.createElement(Text, { style: { color: '#ffffff', fontSize: 9 } }, cs.tourTitle || 'Tour Package'),
        ),
      ),

      // Client / Agent
      React.createElement(View, { style: S.section },
        React.createElement(View, { style: { flexDirection: 'row', gap: 40 } },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Client'),
            React.createElement(Text, { style: [S.body, S.bold] }, cs.client?.name || '—'),
            cs.client?.email && React.createElement(Text, { style: S.body }, cs.client.email),
            cs.client?.phone && React.createElement(Text, { style: S.body }, cs.client.phone),
          ),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Agent'),
            React.createElement(Text, { style: S.body }, cs.agent?.name || '—'),
            cs.agent?.company && React.createElement(Text, { style: S.body }, cs.agent.company),
          ),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: S.sectionTitle }, 'Tour Details'),
            React.createElement(Text, { style: S.body }, `${cs.days} days · ${cs.boardBasis || 'FB'} board`),
            React.createElement(Text, { style: S.body }, `${numAdults}A${numChildren > 0 ? ` + ${numChildren}C` : ''} · ${currency} · Markup ${markupPercent}%`),
          ),
        ),
      ),

      // Daily Breakdown
      React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Daily Breakdown'),
        React.createElement(View, { style: S.tHead }, ...headerRow),
        ...dayRowEls,
        React.createElement(View, { style: S.totTable },
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Accommodation (per adult)'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(accomPerPersonSum)}`),
          ),
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Park Fees'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(parkGroupTotal)}`),
          ),
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Transport'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(transportGroupTotal)}  (${fmt2(transportPerPax)}/pax)`),
          ),
          flightGroupTotal > 0 && React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Flights'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(flightGroupTotal)}`),
          ),
          fixedExtras.length > 0 && React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Extras & Fees'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(extrasTotal)}`),
          ),
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, 'Subtotal (per adult)'),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(subtotal)}`),
          ),
          React.createElement(View, { style: S.totRow },
            React.createElement(Text, { style: S.totLabel }, `Markup (${markupPercent}%)`),
            React.createElement(Text, { style: S.totValue }, `${currency} ${fmt2(markupAmount)}`),
          ),
          React.createElement(View, { style: S.totFinal },
            React.createElement(Text, { style: { ...S.totLabel, fontFamily: 'Helvetica-Bold' } }, 'Grand Total'),
            React.createElement(Text, { style: { ...S.totValue, fontSize: 11 } }, `${currency} ${fmt2(grandTotal)}`),
          ),
        ),
      ),

      // Per adult / per child pricing
      React.createElement(View, { style: { padding: '10 24' } },
        React.createElement(View, { style: S.perCostBox },
          numChildren > 0 && React.createElement(View, { key: 'pc', style: S.perCostItem },
            React.createElement(Text, { style: S.perCostLabel }, 'Per Child Cost'),
            React.createElement(Text, { style: S.perCostValue }, `${currency} ${fmt2(perChildCost)}`),
          ),
          React.createElement(View, { key: 'pa', style: S.perCostItem },
            React.createElement(Text, { style: S.perCostLabel }, 'Per Adult Cost'),
            React.createElement(Text, { style: S.perCostValue }, `${currency} ${fmt2(perAdultCost)}`),
          ),
          React.createElement(View, { key: 'gt', style: S.perCostGrand },
            React.createElement(Text, { style: S.perCostLabel }, `Group Total (${numPax} pax)`),
            React.createElement(Text, { style: S.perCostGrandValue }, `${currency} ${fmt2(grandTotal)}`),
          ),
        ),
      ),

      // Fixed costs extras list (if any)
      fixedExtras.length > 0 && React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Fixed Costs & Extras'),
        ...fixedExtras,
      ),

      // Notes
      cs.notes && React.createElement(View, { style: S.notesBox },
        React.createElement(Text, { style: S.notesLabel }, 'Notes'),
        React.createElement(Text, { style: S.notesText }, cs.notes),
      ),

      // Footer
      React.createElement(View, { style: S.footer },
        React.createElement(View, { style: S.footerLeft },
          React.createElement(Text, { style: S.footerBold }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.footerTxt }, 'info@jaetravel.co.ke  ·  www.jaetravel.co.ke'),
        ),
        React.createElement(View, { style: S.footerRight },
          React.createElement(Text, { style: { ...S.footerTxt, fontFamily: 'Helvetica-Bold' } }, `CS-${cs.id?.slice(-8).toUpperCase()}`),
        ),
      ),
      React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
    )
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const costSheet = await prisma.costSheet.findUnique({
    where: { id: params.id },
    include: { client: true, agent: true, booking: true },
  });

  if (!costSheet) return new NextResponse('Not found', { status: 404 });

  try {
    const buffer = await renderToBuffer(CostSheetPDF({ cs: costSheet }) as any);
    const filename = `CostSheet_${costSheet.id?.slice(-8).toUpperCase()}.pdf`;
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (e: any) {
    console.error('Cost Sheet PDF generation error:', e);
    return new NextResponse(`PDF generation failed: ${e.message}`, { status: 500 });
  }
}