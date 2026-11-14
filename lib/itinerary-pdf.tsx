// lib/itinerary-pdf.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// ───────────────────────────────────────────────────────────────────────────
// Logo (embedded at runtime from public/logo.jpg)
// ───────────────────────────────────────────────────────────────────────────
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.jpg');
let LOGO_SRC: string | null = null;
try {
  const logoBuf = fs.readFileSync(LOGO_PATH);
  LOGO_SRC = `data:image/jpeg;base64,${logoBuf.toString('base64')}`;
} catch (err: unknown) {
  console.warn('[PDF] Could not load logo from public/logo.jpg:', err instanceof Error ? err.message : String(err));
}

// ───────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff', flexDirection: 'column' },
  header: { backgroundColor: '#1a1a2e', padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogoLeft: { width: 44, height: 44, backgroundColor: '#f97316', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerLogoRight: { width: 44, height: 44, backgroundColor: '#f97316', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerLogoTx: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerRightText: { alignItems: 'flex-end' },
  headerTitle: { color: '#ffffff', fontSize: 13, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#fb923c', fontSize: 9, marginTop: 2 },
  headerDate: { color: '#9ca3af', fontSize: 8, marginTop: 2 },
  hero: { backgroundColor: '#f97316', padding: '14 24' },
  heroTitle: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  heroMeta: { flexDirection: 'row', gap: 24, marginTop: 5, flexWrap: 'wrap' },
  heroMetaTxt: { color: '#fed7aa', fontSize: 9 },
  heroMetaVal: { color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  section: { padding: '14 24', borderBottom: '1 solid #f3f4f6' },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  body: { fontSize: 9, color: '#4b5563', lineHeight: 1.6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  table: { margin: '8 0' },
  tHead: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottom: '1 solid #e5e7eb', paddingVertical: 6 },
  tRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', paddingVertical: 6 },
  tCell: { fontSize: 8, color: '#374151', paddingHorizontal: 6 },
  tCellHd: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', paddingHorizontal: 6 },
  dayBadge: { backgroundColor: '#f97316', color: '#ffffff', fontSize: 7, fontFamily: 'Helvetica-Bold', padding: '2 6', borderRadius: 3 },
  daySection: { padding: '14 24' },
  dayGrid: { flexDirection: 'row', gap: 12 },
  dayMain: { flex: 2 },
  daySide: { flex: 1, gap: 8 },
  actBox: { backgroundColor: '#fff7ed', border: '1 solid #fed7aa', borderRadius: 4, padding: 8, marginBottom: 12 },
  actTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  actItem: { fontSize: 8, color: '#374151', marginBottom: 2 },
  actTime: { fontFamily: 'Helvetica-Bold', color: '#c2410c' },
  sideCard: { backgroundColor: '#f9fafb', borderRadius: 4, padding: 8 },
  sideLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 },
  sideTxt: { fontSize: 8, color: '#374151' },
  imgContainer: { marginTop: 12 },
  imgTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  imgRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  imgCell: { width: '30%', marginBottom: 8 },
  imgThumb: { width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 },
  imgCaption: { fontSize: 7, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  footer: { backgroundColor: '#f9fafb', padding: '14 24', flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerTxt: { fontSize: 8, color: '#6b7280' },
  footerBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  footerItalic: { fontSize: 8, color: '#9ca3af' },
  pageNum: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4, fontSize: 8, color: '#9ca3af', textAlign: 'right' },
  costTable: { marginTop: 12 },
  optionalTable: { marginTop: 12 },
  paymentBox: { marginTop: 12, padding: 8, border: '1 solid #e5e7eb', borderRadius: 4, backgroundColor: '#f9fafb' },
});

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
export function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function safeParseJson(data: any, fallback: any[] = []) {
  if (!data) return fallback;
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
  return fallback;
}

export function isValidImage(img: any): boolean {
  if (!img) return false;
  if (!img.data) return false;
  if (!img.mimeType) return false;
  return true;
}

export function extractBase64(data: string): string | null {
  if (!data) return null;
  if (data.startsWith('data:')) {
    const parts = data.split(',');
    return parts.length > 1 ? parts[1] : null;
  }
  const cleaned = data.replace(/\s/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

export function buildImageSrc(img: any): string | null {
  try {
    const raw = img.data;
    if (!raw) return null;
    if (typeof raw !== 'string') return null;
    const base64Data = extractBase64(raw);
    if (!base64Data) return null;
    if (base64Data.length === 0) return null;
    const mimeType = (img.mimeType && img.mimeType.startsWith('image/')) ? img.mimeType : 'image/jpeg';
    return `data:${mimeType};base64,${base64Data}`;
  } catch (err) {
    console.error(`[PDF] Error building image src for ${img.id}:`, err);
    return null;
  }
}

export function renderImage(img: any, key: string) {
  try {
    const src = buildImageSrc(img);
    if (!src) {
      console.log(`[PDF] Skipping image ${img.id} - could not build src`);
      return null;
    }
    return React.createElement(View, { key, style: S.imgCell },
      React.createElement(PDFImage, { src, style: S.imgThumb }),
      img.caption ? React.createElement(Text, { style: S.imgCaption }, img.caption) : null,
    );
  } catch (err) {
    console.error(`[PDF] Error rendering image ${img.id}:`, err);
    return null;
  }
}

export async function processImageForPDF(img: any): Promise<any> {
  try {
    const { Jimp } = await import('jimp');
    const base64Data = extractBase64(img.data) || '';
    const imageBuffer = Buffer.from(base64Data, 'base64');
    if (imageBuffer.length < 4) return img;
    if (imageBuffer[0] === 0x25 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x44 && imageBuffer[3] === 0x46) {
      console.error(`[PDF] Skipping PDF file: ${img.filename || img.id}`);
      return img;
    }
    const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
    const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
    const isWebp = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46;
    if (isJpeg) return img;
    if (isPng) return img;
    let image;
    try {
      image = await Jimp.read(imageBuffer);
    } catch {
      console.error(`[PDF] Jimp cannot decode image ${img.id} — skipping`);
      return img;
    }
    const jpegBuffer = await (image as any).write('image/jpeg');
    const jpegBase64 = jpegBuffer.toString('base64');
    return { ...img, data: `data:image/jpeg;base64,${jpegBase64}`, mimeType: 'image/jpeg' };
  } catch (err) {
    console.error(`[PDF] Failed to process image ${img.id}:`, err);
    return img;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Page sizing constants
// ───────────────────────────────────────────────────────────────────────────
const PAGE_WIDTH = 595;

const COVER = {
  header: 92, hero: 60, letterSection: 160, tableSection: 56, tableRowH: 24,
  costSectionBase: 60, costTableHeaderH: 28, costRowH: 20, costTotalH: 20,
  paymentBoxH: 56, optionalSectionH: 56, optionalRowH: 20, includedExcludedH: 70,
  pageNum: 28, buffer: 32,
};

const DAY = {
  miniHeader: 36, hero: 40, sectionPad: 28, notesLineH: 16,
  actBoxBase: 44, actItemH: 14, imgContainerTop: 16, imgTitleH: 24,
  imgRowH: 160, sideCardBase: 44, sideCardLineH: 14,
  footer: 58, pageNum: 28, buffer: 60,
};

export function estimateCoverHeight(itinerary: any, costSheet: any): number {
  const costItems = safeParseJson(costSheet?.items || costSheet?.lineItems);
  const optionalExtras = safeParseJson(costSheet?.optionalExtras || costSheet?.options);
  let h = COVER.header + COVER.hero + COVER.letterSection;
  h += COVER.tableSection + itinerary.days.length * COVER.tableRowH;
  if (costSheet) {
    h += COVER.costSectionBase;
    if (costItems.length > 0) h += COVER.costTableHeaderH + costItems.length * COVER.costRowH + COVER.costTotalH;
    if (costSheet.paymentInstructions) h += COVER.paymentBoxH;
    if (optionalExtras.length > 0) h += COVER.optionalSectionH + optionalExtras.length * COVER.optionalRowH;
    if (costSheet.included || costSheet.excluded) h += COVER.includedExcludedH;
  }
  return h + COVER.pageNum + COVER.buffer;
}

export function estimateDayHeight(day: any, destImgs: any[], hotelImgs: any[], dayImgs: any[]): number {
  const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
  const activities: any[] = day.activities ? JSON.parse(day.activities) : [];
  const validDay = dayImgs.filter(isValidImage);
  let leftH = 0;
  if (day.notes) leftH += Math.ceil(day.notes.length / 75) * DAY.notesLineH + 8;
  if (activities.length > 0) leftH += DAY.actBoxBase + activities.length * DAY.actItemH + 12;
  if (validDay.length > 0) leftH += DAY.imgContainerTop + DAY.imgTitleH + Math.ceil(validDay.length / 3) * DAY.imgRowH;
  let rightH = 0;
  if (day.accommodation) rightH += DAY.sideCardBase + 8;
  const mealCount = [meals.breakfast, meals.lunch, meals.dinner, meals.note].filter(Boolean).length;
  if (mealCount > 0) rightH += DAY.sideCardBase + (mealCount - 1) * DAY.sideCardLineH + 8;
  const destRows = destImgs.length > 0 ? Math.ceil(Math.min(destImgs.length, 3) / 3) : 0;
  const hotelRows = hotelImgs.length > 0 ? Math.ceil(Math.min(hotelImgs.length, 3) / 3) : 0;
  const galleryRows = destRows + hotelRows;
  if (galleryRows > 0) leftH += galleryRows * (DAY.imgTitleH + DAY.imgRowH) + (galleryRows * 10);
  return DAY.miniHeader + DAY.hero + DAY.sectionPad + Math.max(leftH, rightH) + DAY.footer + DAY.pageNum + DAY.buffer;
}

// ───────────────────────────────────────────────────────────────────────────
// PDF Component
// ───────────────────────────────────────────────────────────────────────────
export function ItineraryPDF({ itinerary, costSheet, imagesByDay, counties, hotels, selectedPaxCosting, selectedPaxCostings }: {
  itinerary: any;
  costSheet: any;
  imagesByDay: Record<string, any[]>;
  counties: any[];
  hotels: any[];
  selectedPaxCosting?: { pax: number; grandtotal: number };
  selectedPaxCostings?: { pax: number; grandtotal: number }[];
}) {
  const b = itinerary.booking;
  const hasBooking = !!b;
  const dayCount = itinerary.days.length;
  const nightCount = Math.max(0, dayCount - 1);
  const costItems = safeParseJson(costSheet?.items || costSheet?.lineItems);
  const optionalExtras = safeParseJson(costSheet?.optionalExtras || costSheet?.options);
  const totalAmount = costSheet?.total || 0;
  const coverHeight = estimateCoverHeight(itinerary, costSheet);

  const bookingRef = hasBooking ? b.bookingRef || '-' : '-';
  const numAdults = hasBooking ? b.numAdults : 0;
  const isResident = hasBooking ? b.isResident : false;
  const startDate = hasBooking ? b.startDate : new Date();
  const clientName = hasBooking && b.client ? b.client.name : 'Client';
  const startDestination = hasBooking ? b.startDestination : 'Nairobi';

  // Build lookup maps by name (case-insensitive)
  const countyByName = new Map(counties.map((c: any) => [c.name.toLowerCase(), c]));
  const hotelByName = new Map(hotels.map((h: any) => [h.name.toLowerCase(), h]));

  // Track which images have already been shown per destination / accommodation,
  // so when the same destination or hotel appears on multiple days the images do not repeat.
  const usedDestImgIds = new Set<string>();
  const usedHotelImgIds = new Set<string>();

  const markUsed = (imgs: any[]) => {
    for (const img of imgs) {
      if (img && img.id) {
        if (img.source === 'destination') usedDestImgIds.add(img.id);
        if (img.source === 'hotel') usedHotelImgIds.add(img.id);
      }
    }
  };

  const getDestinationImages = (destinationName: string) => {
    const county = countyByName.get(destinationName.toLowerCase());
    const imgs = (county?.images || []).filter((img: any) => !usedDestImgIds.has(img.id));
    return imgs.map((img: any) => ({ ...img, source: 'destination' })).slice(0, 3);
  };
  const getHotelImages = (accommodationName: string) => {
    const hotel = hotelByName.get(accommodationName.toLowerCase());
    const imgs = (hotel?.images || []).filter((img: any) => !usedHotelImgIds.has(img.id));
    return imgs.map((img: any) => ({ ...img, source: 'hotel' })).slice(0, 3);
  };

  // Logo image elements (fall back to text 'JT' if logo failed to load)
  const logoEl = LOGO_SRC
    ? React.createElement(PDFImage, { src: LOGO_SRC, style: S.headerLogoLeft })
    : React.createElement(View, { style: S.headerLogoLeft }, React.createElement(Text, { style: S.headerLogoTx }, 'JT'));
  const logoElRight = LOGO_SRC
    ? React.createElement(PDFImage, { src: LOGO_SRC, style: S.headerLogoRight })
    : React.createElement(View, { style: S.headerLogoRight }, React.createElement(Text, { style: S.headerLogoTx }, 'JT'));

  const firstPage = React.createElement(Page, { size: [PAGE_WIDTH, coverHeight], style: S.page, key: 'cover' },
    React.createElement(View, { style: S.header },
      React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
        logoEl,
        React.createElement(View, null,
          React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.headerSub }, `Proposal Ref: #${bookingRef}`),
        ),
      ),
      React.createElement(View, { style: { alignItems: 'flex-end' } },
        logoElRight,
        React.createElement(Text, { style: S.headerDate }, `Issued: ${fmt(new Date())}`),
      ),
    ),
    React.createElement(View, { style: S.hero },
      React.createElement(Text, { style: S.heroTitle }, itinerary.title),
      React.createElement(View, { style: S.heroMeta },
        React.createElement(Text, { style: S.heroMetaTxt }, 'Tour Length: ', React.createElement(Text, { style: S.heroMetaVal }, `${dayCount} Days / ${nightCount} Nights`)),
        React.createElement(Text, { style: S.heroMetaTxt }, 'Travelers: ', React.createElement(Text, { style: S.heroMetaVal }, `${numAdults}x ${isResident ? 'Residents' : 'Non-Residents'}`)),
        React.createElement(Text, { style: S.heroMetaTxt }, 'Start: ', React.createElement(Text, { style: S.heroMetaVal }, fmt(startDate))),
      ),
    ),
    React.createElement(View, { style: S.section },
      React.createElement(Text, { style: [S.body, S.bold] }, `Dear ${clientName},`),
      React.createElement(Text, { style: [S.body, { marginTop: 6 }] }, `Thank you for giving us the opportunity to prepare this custom-made quote for your ${itinerary.title}.`),
      React.createElement(Text, { style: [S.body, { marginTop: 4 }] }, `Your tour begins in ${startDestination} on ${fmt(startDate)} and runs for ${dayCount} day${dayCount !== 1 ? 's' : ''} and ${nightCount} night${nightCount !== 1 ? 's' : ''}.`),
      React.createElement(Text, { style: [S.body, { marginTop: 4 }] }, 'Please let us know if you have any questions, or if you would like any further details.'),
      React.createElement(Text, { style: [S.body, { marginTop: 6 }] }, 'Best regards,'),
      React.createElement(Text, { style: [S.body, S.bold] }, 'Jae Travel Expeditions'),
    ),
    React.createElement(View, { style: S.section },
      React.createElement(Text, { style: S.sectionTitle }, 'Day by Day Summary'),
      React.createElement(View, { style: S.table },
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { width: 50 }] }, 'Day'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Destination'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Accommodation'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Meals'),
        ),
        ...itinerary.days.map((day: any) => {
          const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
          const mealList = [meals.breakfast && 'Breakfast', meals.lunch && 'Lunch', meals.dinner && 'Dinner', meals.note].filter(Boolean).join(' · ');
          return React.createElement(View, { style: S.tRow, key: day.id },
            React.createElement(View, { style: { width: 50, paddingHorizontal: 6 } }, React.createElement(Text, { style: S.dayBadge }, `Day ${day.dayNumber}`)),
            React.createElement(Text, { style: [S.tCell, { flex: 2, fontFamily: 'Helvetica-Bold' }] }, day.destination),
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, day.accommodation || 'No accommodation'),
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, mealList || '—'),
          );
        }),
      ),
    ),
    costSheet && React.createElement(View, { style: S.section },
      React.createElement(Text, { style: S.sectionTitle }, 'Breakdown of Costs'),
      costItems.length > 0 && React.createElement(View, { style: S.costTable },
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Item'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Qty'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Unit Price'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Total'),
        ),
        ...costItems.map((item: any, idx: number) =>
          React.createElement(View, { style: S.tRow, key: idx },
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, item.description || item.name),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, item.quantity || ''),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, `$${(item.unitPrice || 0).toFixed(2)}`),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, `$${(item.total || 0).toFixed(2)}`),
          ),
        ),
        React.createElement(View, { style: [S.tRow, { backgroundColor: '#fef3c7' }] },
          React.createElement(Text, { style: [S.tCell, { flex: 5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, 'Total in USD'),
          React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, `$${totalAmount.toFixed(2)}`),
        ),
      ),
      costSheet.paymentInstructions && React.createElement(View, { style: S.paymentBox },
        React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '💳 Payment Details'),
        React.createElement(Text, { style: S.sideTxt }, costSheet.paymentInstructions),
      ),
      optionalExtras.length > 0 && React.createElement(View, { style: S.optionalTable },
        React.createElement(Text, { style: S.sectionTitle }, 'Optional (not included)'),
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Option'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Destination'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Price'),
        ),
        ...optionalExtras.map((opt: any, idx: number) =>
          React.createElement(View, { style: S.tRow, key: idx },
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, opt.name),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, opt.destination || ''),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, `$${(opt.price || 0).toFixed(2)}`),
          ),
        ),
      ),
      (costSheet.included || costSheet.excluded) && React.createElement(View, { style: { marginTop: 12 } },
        costSheet.included && React.createElement(View, null,
          React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '✓ Included'),
          React.createElement(Text, { style: S.sideTxt }, costSheet.included),
        ),
        costSheet.excluded && React.createElement(View, { style: { marginTop: 8 } },
          React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '✗ Excluded'),
          React.createElement(Text, { style: S.sideTxt }, costSheet.excluded),
        ),
      ),
    ),
    // Costing by Pax table (Each Person)
    React.createElement(View, { style: S.section },
      React.createElement(Text, { style: S.sectionTitle }, 'Costing by Pax (Each Person)'),
      React.createElement(Text, { style: [S.body, { marginBottom: 6 }] }, 'Total price per traveler count for your group.'),
      React.createElement(View, { style: S.costTable },
        React.createElement(View, { style: S.tHead },
          React.createElement(Text, { style: [S.tCellHd, { flex: 1 }] }, 'Travelers'),
          React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Grand Total'),
        ),
        ...(selectedPaxCostings && selectedPaxCostings.length > 0
          ? selectedPaxCostings
          : selectedPaxCosting
            ? [selectedPaxCosting]
            : []
        ).map((opt: any) =>
          React.createElement(View, { style: S.tRow, key: `cost-opt-${opt.pax}` },
            React.createElement(Text, { style: [S.tCell, { flex: 1 }] }, `${opt.pax} Person${opt.pax > 1 ? 's' : ''}`),
            React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, `$${(opt.grandtotal || 0).toFixed(2)}`),
          ),
        ),
      ),
    ),
    React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
  );

  const dayPages = itinerary.days.map((day: any) => {
    const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
    const activities: any[] = day.activities ? JSON.parse(day.activities) : [];
    const mealItems = [
      meals.breakfast && '→ Breakfast',
      meals.lunch && '→ Lunch',
      meals.dinner && '→ Dinner',
      meals.note && `→ ${meals.note}`,
    ].filter(Boolean);

    const rawImages = imagesByDay[day.id] || [];
    const validImages = rawImages.filter(isValidImage);
    const destImages = getDestinationImages(day.destination);
    const hotelImages = day.accommodation ? getHotelImages(day.accommodation) : [];
    const pageHeight = estimateDayHeight(day, destImages, hotelImages, validImages);

    const imageElements = validImages.map((img: any, idx: number) => {
      const el = renderImage(img, `img-${day.id}-${idx}`);
      return el;
    }).filter(Boolean);

    const destImageElements = destImages.map((img: any, idx: number) => {
      const el = renderImage(img, `dest-${day.id}-${idx}`);
      return el;
    }).filter(Boolean);

    const hotelImageElements = hotelImages.map((img: any, idx: number) => {
      const el = renderImage(img, `hotel-${day.id}-${idx}`);
      return el;
    }).filter(Boolean);

    // Mark destination & hotel images as used so later days with the same
    // destination/accommodation don't repeat them.
    markUsed(destImages);
    markUsed(hotelImages);

    return React.createElement(Page, { size: [PAGE_WIDTH, pageHeight], style: S.page, key: day.id },
      React.createElement(View, { style: { backgroundColor: '#1a1a2e', padding: '10 24', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
        logoEl,
        React.createElement(Text, { style: { color: '#9ca3af', fontSize: 8 } }, itinerary.title),
      ),
      React.createElement(View, { style: { backgroundColor: '#f97316', padding: '10 24', flexDirection: 'row', alignItems: 'center', gap: 8 } },
        React.createElement(Text, { style: { backgroundColor: '#fff', color: '#f97316', fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '3 7', borderRadius: 10 } }, `Day ${day.dayNumber}`),
        React.createElement(Text, { style: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' } }, day.destination),
        day.date && React.createElement(Text, { style: { color: '#fed7aa', fontSize: 8, marginLeft: 'auto' } }, fmt(day.date)),
      ),
      React.createElement(View, { style: S.daySection },
        React.createElement(View, { style: S.dayGrid },
          React.createElement(View, { style: S.dayMain },
            day.notes && React.createElement(Text, { style: [S.body, { marginBottom: 8 }] }, day.notes),
            activities.length > 0 && React.createElement(View, { style: S.actBox },
              React.createElement(Text, { style: S.actTitle }, 'Activities'),
              ...activities.map((a: any, i: number) =>
                React.createElement(Text, { key: i, style: S.actItem },
                  a.time ? React.createElement(Text, { style: S.actTime }, `${a.time}: `) : null,
                  `→ ${a.description}`,
                ),
              ),
            ),
            destImageElements.length > 0 && React.createElement(View, { style: S.imgContainer },
              React.createElement(Text, { style: S.imgTitle }, `${day.destination} gallery`),
              React.createElement(View, { style: S.imgRow },
                ...destImageElements,
              ),
            ),
            hotelImageElements.length > 0 && React.createElement(View, { style: S.imgContainer },
              React.createElement(Text, { style: S.imgTitle }, `${day.accommodation} gallery`),
              React.createElement(View, { style: S.imgRow },
                ...hotelImageElements,
              ),
            ),
            imageElements.length > 0 && React.createElement(View, { style: S.imgContainer },
              React.createElement(Text, { style: S.imgTitle }, `Day ${day.dayNumber} images`),
              React.createElement(View, { style: S.imgRow },
                ...imageElements,
              ),
            ),
          ),
          React.createElement(View, { style: S.daySide },
            day.accommodation && React.createElement(View, { style: S.sideCard },
              React.createElement(Text, { style: S.sideLabel }, '🏕 Accommodation'),
              React.createElement(Text, { style: S.sideTxt }, day.accommodation),
            ),
            mealItems.length > 0 && React.createElement(View, { style: S.sideCard },
              React.createElement(Text, { style: S.sideLabel }, '🍽 Meals'),
              ...mealItems.map((m, i) => React.createElement(Text, { key: i, style: S.sideTxt }, m)),
            ),
          ),
        ),
      ),
      React.createElement(View, { style: S.footer },
        React.createElement(View, { style: S.footerLeft },
          React.createElement(Text, { style: S.footerBold }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.footerTxt }, 'jaetravelexpeditions@gmail.com'),
          React.createElement(Text, { style: S.footerTxt }, 'www.jaetravel.co.ke'),
        ),
        React.createElement(View, { style: S.footerRight },
          React.createElement(Text, { style: S.footerItalic }, '"Live life with no excuses, travel with no regret"'),
        ),
      ),
      React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
    );
  });

  return React.createElement(Document, { title: itinerary.title }, [firstPage, ...dayPages]);
}
