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
  notesBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginHorizontal: 24, marginTop: 8 },
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#374151' },
  optHeaderRow: { flexDirection: 'row', backgroundColor: '#fff7ed', borderBottom: '1 solid #fed7aa', paddingVertical: 4, paddingHorizontal: 6 },
  optLabelRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderBottom: '1 solid #f3f4f6' },
  optFinalRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#fff7ed', borderTop: '1px solid #fed7aa' },
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

  const monthName = new Date(cs.createdAt).toLocaleDateString('en-KE', { month: 'long' });

  const totalPPS = accomPerPersonSum;
  const totalParkFees = parkGroupTotal;
  const totalTransport = transportGroupTotal;
  const totalExtras = extrasTotal;

  const col = (flex: number, align: 'left' | 'right' = 'left') => {
    const base = { fontSize: 8, paddingHorizontal: 5, flex };
    return align === 'right'
      ? { ...base, color: '#374151', textAlign: 'right' as const }
      : { ...base, color: '#374151' };
  };
  const colHd = (flex: number, align: 'left' | 'right' = 'left') => {
    const base = { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', paddingHorizontal: 5, flex };
    return align === 'right'
      ? { ...base, textAlign: 'right' as const }
      : base;
  };
  const colR = (flex: number) => ({ ...col(flex, 'right'), fontFamily: 'Helvetica-Bold', color: '#111827' });

  const tableHeader = [
    React.createElement(Text, { style: colHd(1.5), key: 'h0' }, 'Days'),
    React.createElement(Text, { style: colHd(3), key: 'h1' }, 'Properties'),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h2' }, 'PPS'),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h3' }, 'SRS'),
    React.createElement(Text, { style: colHd(1.5, 'right'), key: 'h4' }, 'Park Fees'),
    React.createElement(Text, { style: colHd(1.5, 'right'), key: 'h5' }, 'Transport'),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h6' }, 'Extras'),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h7' }, ''),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h8' }, ''),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h9' }, ''),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h10' }, ''),
    React.createElement(Text, { style: colHd(1, 'right'), key: 'h11' }, ''),
  ];

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
    const transport = Number(row.transportTotal) || 0;
    const transportPP = numPax > 0 ? transport / numPax : 0;
    const flightA = row.hasFlight ? (Number(row.flightAdultPP) || 0) * numAdults : 0;
    const flightC = row.hasFlight ? (Number(row.flightChildPP) || 0) * numChildren : 0;
    const dayTotal = (adultPP) + parkA + transportPP + flightA + flightC;

    return React.createElement(View, { key: `dr${i}`, style: S.tRow },
      React.createElement(Text, { style: col(1.5) }, `Day${i + 1}`),
      React.createElement(Text, { style: col(3) }, row.hotelName || row.destinationName || ''),
      React.createElement(Text, { style: col(1, 'right') }, `${currency} ${fmt2(adultPP)}`),
      React.createElement(Text, { style: col(1, 'right') }, ''),
      React.createElement(Text, { style: col(1.5, 'right') }, `${currency} ${fmt2(parkA)}`),
      React.createElement(Text, { style: col(1.5, 'right') }, `${currency} ${fmt2(transport)}`),
      ...[0, 1, 2, 3, 4, 5].map(j => React.createElement(Text, { style: col(1, 'right'), key: `ex${j}` }, '')),
    );
  });

  const extrasRows: any[] = [];
  if (cs.fileHandlingFee > 0) {
    extrasRows.push(React.createElement(View, { key: 'fh', style: S.tRow },
      React.createElement(Text, { style: col(1.5) }, ''),
      React.createElement(Text, { style: col(3) }, 'File handling fees'),
      ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `fe${j}` }, j === 0 ? `${currency} ${fmt2(cs.fileHandlingFee)}` : '')),
    ));
  }
  if (cs.ecoBottle > 0) {
    extrasRows.push(React.createElement(View, { key: 'eb', style: S.tRow },
      React.createElement(Text, { style: col(1.5) }, ''),
      React.createElement(Text, { style: col(3) }, 'Eco steel bottle + mineral water'),
      ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `eb${j}` }, j === 0 ? `${currency} ${fmt2(cs.ecoBottle)}` : '')),
    ));
  }
  if (cs.evacInsurance > 0) {
    extrasRows.push(React.createElement(View, { key: 'ei', style: S.tRow },
      React.createElement(Text, { style: col(1.5) }, ''),
      React.createElement(Text, { style: col(3) }, 'Evacuation Insurance'),
      ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `ei${j}` }, j === 0 ? `${currency} ${fmt2(cs.evacInsurance)}` : '')),
    ));
  }
  if (cs.maasaiVillage) {
    extrasRows.push(React.createElement(View, { key: 'mv', style: S.tRow },
      React.createElement(Text, { style: col(1.5) }, ''),
      React.createElement(Text, { style: col(3) }, 'Maasai Village Visit'),
      ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `mv${j}` }, j === 0 ? `${currency} ${fmt2(cs.maasaiCost || 0)}` : '')),
    ));
  }
  extras.forEach((e: any, i: number) => {
    if (Number(e.cost) > 0) {
      extrasRows.push(React.createElement(View, { key: `ex${i}`, style: S.tRow },
        React.createElement(Text, { style: col(1.5) }, ''),
        React.createElement(Text, { style: col(3) }, e.label || 'Extra'),
        ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `exv${i}${j}` }, j === 0 ? `${currency} ${fmt2(Number(e.cost))}` : '')),
      ));
    }
  });

  const buildOptionsSection = () => {
    const groupSizes = [2, 4, 6, 8];
    const rows: any[] = [];
    const optsPerRow = 4;
    const optWidth = 13 / optsPerRow;

    groupSizes.forEach((size, gi) => {
      const groupSubtotal = subtotal;
      const groupMarkup = groupSubtotal * (markupPercent / 100);
      const groupRate = groupSubtotal + groupMarkup;

      rows.push(
        React.createElement(View, { key: `oph${gi}`, style: S.optHeaderRow },
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e', flex: 1 } }, `Option 0${gi + 1}`),
          React.createElement(Text, { style: { fontSize: 8, color: '#92400e', flex: 2 } }, `Based on ${size} people`),
          React.createElement(Text, { style: { fontSize: 8, color: '#92400e', flex: 1, textAlign: 'right' } }, 'PPS'),
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', flex: 2, textAlign: 'right' } }, ''),
        ),
      );
      rows.push(
        React.createElement(View, { key: `opp${gi}`, style: S.optLabelRow },
          React.createElement(Text, { style: { fontSize: 8, color: '#374151', flex: 1 } }, ''),
          React.createElement(Text, { style: { fontSize: 8, color: '#374151', flex: 2 } }, 'Per person sharing'),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1, textAlign: 'right' } }, `${currency} ${fmt2(groupSubtotal)}`),
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', flex: 2, textAlign: 'right' } }, ''),
        ),
      );
      rows.push(
        React.createElement(View, { key: `opm${gi}`, style: S.optLabelRow },
          React.createElement(Text, { style: { fontSize: 8, color: '#374151', flex: 1 } }, ''),
          React.createElement(Text, { style: { fontSize: 8, color: '#374151', flex: 2 } }, `Mark up ${markupPercent}%`),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1, textAlign: 'right' } }, `${currency} ${fmt2(groupMarkup)}`),
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', flex: 2, textAlign: 'right' } }, ''),
        ),
      );
      rows.push(
        React.createElement(View, { key: `opr${gi}`, style: S.optFinalRow },
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 1 } }, ''),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', flex: 2 } }, 'Rate Charged'),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#f97316', flex: 1, textAlign: 'right' } }, `${currency} ${fmt2(groupRate)}`),
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', flex: 2, textAlign: 'right' } }, ''),
        ),
      );
    });
    return rows;
  };

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

      // Client / Agent / Tour Details
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

      // Main Pricing Table (CSV format)
      React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Pricing Breakdown'),

        // Header row
        React.createElement(View, { style: S.tHead }, ...tableHeader),

        // Month row
        React.createElement(View, { style: S.tRow },
          React.createElement(Text, { style: { ...col(1.5), fontFamily: 'Helvetica-Bold', color: '#92400e' } }, monthName),
          ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(j => React.createElement(Text, { style: col(1, 'right'), key: `mr${j}` }, '')),
        ),

        // Day rows
        ...dayRowEls,

        // Empty rows for spacing
        ...Array.from({ length: 3 }, (_, i) =>
          React.createElement(View, { key: `sp${i}`, style: S.tRow },
            ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(j => React.createElement(Text, { style: col(1), key: `sp${i}${j}` }, '')),
          )
        ),

        // Extras section header
        React.createElement(View, { style: S.tRow },
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', paddingHorizontal: 5, flex: 1.5 } }, ''),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', paddingHorizontal: 5, flex: 3 } }, 'Extras'),
          ...[0, 1, 2, 3, 4, 5].map(j => React.createElement(Text, { style: col(1, 'right'), key: `exhd${j}` }, '')),
        ),

        // Extra items rows
        ...extrasRows,

        // Empty row
        React.createElement(View, { style: S.tRow },
          ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(j => React.createElement(Text, { style: col(1), key: `er${j}` }, '')),
        ),

        // Totals row
        React.createElement(View, { style: { ...S.tRow, backgroundColor: '#fff7ed' } },
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', paddingHorizontal: 5, flex: 1.5 } }, ''),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', paddingHorizontal: 5, flex: 3 } }, 'Totals'),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', paddingHorizontal: 5, flex: 1, textAlign: 'right' } }, `${currency} ${fmt2(totalPPS)}`),
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280', paddingHorizontal: 5, flex: 1, textAlign: 'right' } }, ''),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', paddingHorizontal: 5, flex: 1.5, textAlign: 'right' } }, `${currency} ${fmt2(totalParkFees)}`),
          React.createElement(Text, { style: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', paddingHorizontal: 5, flex: 1.5, textAlign: 'right' } }, `${currency} ${fmt2(totalTransport)}`),
          ...[0, 1, 2, 3, 4, 5].map((_, j) => React.createElement(Text, { style: col(1, 'right'), key: `tot${j}` }, '')),
        ),
      ),

      // Options Section (2, 4, 6, 8 pax)
      React.createElement(View, { style: { padding: '10 24' } },
        React.createElement(Text, { style: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 6 } }, 'Pricing Options'),
        ...buildOptionsSection(),
      ),

      // Per adult / per child / group totals
      React.createElement(View, { style: { padding: '0 24', flexDirection: 'row', gap: 40, marginTop: 8 } },
        numChildren > 0 && React.createElement(View, { key: 'pc', style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280' } }, 'Per Child Cost'),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#f97316' } }, `${currency} ${fmt2(perChildCost)}`),
        ),
        React.createElement(View, { key: 'pa', style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280' } }, 'Per Adult Cost'),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#f97316' } }, `${currency} ${fmt2(perAdultCost)}`),
        ),
        React.createElement(View, { key: 'gt', style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280' } }, `Group Total (${numPax} pax)`),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' } }, `${currency} ${fmt2(grandTotal)}`),
        ),
        React.createElement(View, { key: 'mu', style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: '#6b7280' } }, 'Markup'),
          React.createElement(Text, { style: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' } }, `${markupPercent}%`),
        ),
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