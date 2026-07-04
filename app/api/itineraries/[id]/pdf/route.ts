// app/api/itineraries/[id]/pdf/route.ts
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

// ───────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#ffffff', flexDirection: 'column' },
  header: { backgroundColor: '#1a1a2e', padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 44, height: 44, backgroundColor: '#f97316', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerLogoTx: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
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
function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function safeParseJson(data: any, fallback: any[] = []) {
  if (!data) return fallback;
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
  return fallback;
}

// Check if image has data and mimeType - be permissive
function isValidImage(img: any): boolean {
  if (!img) return false;
  if (!img.data) return false;
  if (!img.mimeType) return false;
  return true;
}

// Extract pure base64 from data URL or raw base64
function extractBase64(data: string): string | null {
  if (!data) return null;
  
  if (data.startsWith('data:')) {
    const parts = data.split(',');
    return parts.length > 1 ? parts[1] : null;
  }
  
  const cleaned = data.replace(/\s/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

// Build image src for PDF - use actual mimeType from image
function buildImageSrc(img: any): string | null {
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

function renderImage(img: any, key: string) {
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

async function processImageForPDF(img: any): Promise<any> {
  try {
    const { Jimp } = await import('jimp');
    const base64Data = extractBase64(img.data) || '';
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Skip non-image files
    if (imageBuffer.length < 4) return img;

    // PDF files (PDF magic bytes: 25 50 44 46 = %PDF)
    if (imageBuffer[0] === 0x25 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x44 && imageBuffer[3] === 0x46) {
      console.error(`[PDF] Skipping PDF file: ${img.filename || img.id}`);
      return img;
    }

    // Detect actual format from magic bytes — JPEG: FF D8 FF, PNG: 89 50 4E 47, WEBP: 52 49 46 46
    const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
    const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
    const isWebp = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46;

    if (isJpeg) return img;
    if (isPng) return img;

    // Convert anything else (WEBP, BMP, GIF, etc.) to JPEG via Jimp
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

function estimateCoverHeight(itinerary: any, costSheet: any): number {
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

function estimateDayHeight(day: any, images: any[]): number {
  const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
  const activities: any[] = day.activities ? JSON.parse(day.activities) : [];
  const validImages = images.filter(isValidImage);
  let leftH = 0;
  if (day.notes) leftH += Math.ceil(day.notes.length / 75) * DAY.notesLineH + 8;
  if (activities.length > 0) leftH += DAY.actBoxBase + activities.length * DAY.actItemH + 12;
  if (validImages.length > 0) leftH += DAY.imgContainerTop + DAY.imgTitleH + Math.ceil(validImages.length / 3) * DAY.imgRowH;
  let rightH = 0;
  if (day.accommodation) rightH += DAY.sideCardBase + 8;
  const mealCount = [meals.breakfast, meals.lunch, meals.dinner, meals.note].filter(Boolean).length;
  if (mealCount > 0) rightH += DAY.sideCardBase + (mealCount - 1) * DAY.sideCardLineH + 8;
  return DAY.miniHeader + DAY.hero + DAY.sectionPad + Math.max(leftH, rightH) + DAY.footer + DAY.pageNum + DAY.buffer;
}

// ───────────────────────────────────────────────────────────────────────────
// PDF Component
// ───────────────────────────────────────────────────────────────────────────
function ItineraryPDF({ itinerary, costSheet, imagesByDay }: {
  itinerary: any;
  costSheet: any;
  imagesByDay: Record<string, any[]>;
}) {
  const b = itinerary.booking;
  const dayCount = itinerary.days.length;
  const nightCount = Math.max(0, dayCount - 1);
  const costItems = safeParseJson(costSheet?.items || costSheet?.lineItems);
  const optionalExtras = safeParseJson(costSheet?.optionalExtras || costSheet?.options);
  const totalAmount = costSheet?.total || 0;
  const coverHeight = estimateCoverHeight(itinerary, costSheet);

  const firstPage = React.createElement(Page, { size: [PAGE_WIDTH, coverHeight], style: S.page, key: 'cover' },
    React.createElement(View, { style: S.header },
      React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
        React.createElement(View, { style: S.headerLogo }, React.createElement(Text, { style: S.headerLogoTx }, 'JT')),
        React.createElement(View, null,
          React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.headerSub }, `Proposal Ref: #${b.bookingRef}`),
        ),
      ),
      React.createElement(View, { style: S.headerRight },
        React.createElement(Text, { style: S.headerDate }, `Issued: ${fmt(new Date())}`),
      ),
    ),
    React.createElement(View, { style: S.hero },
      React.createElement(Text, { style: S.heroTitle }, itinerary.title),
      React.createElement(View, { style: S.heroMeta },
        React.createElement(Text, { style: S.heroMetaTxt }, 'Tour Length: ', React.createElement(Text, { style: S.heroMetaVal }, `${dayCount} Days / ${nightCount} Nights`)),
        React.createElement(Text, { style: S.heroMetaTxt }, 'Travelers: ', React.createElement(Text, { style: S.heroMetaVal }, `${b.numAdults}x ${b.isResident ? 'Residents' : 'Non-Residents'}`)),
        React.createElement(Text, { style: S.heroMetaTxt }, 'Start: ', React.createElement(Text, { style: S.heroMetaVal }, fmt(b.startDate))),
      ),
    ),
    React.createElement(View, { style: S.section },
      React.createElement(Text, { style: [S.body, S.bold] }, `Dear ${b.client.name},`),
      React.createElement(Text, { style: [S.body, { marginTop: 6 }] }, `Thank you for giving us the opportunity to prepare this custom-made quote for your ${itinerary.title}.`),
      React.createElement(Text, { style: [S.body, { marginTop: 4 }] }, `Your tour begins in ${b.startDestination || 'Nairobi'} on ${fmt(b.startDate)} and runs for ${dayCount} day${dayCount !== 1 ? 's' : ''} and ${nightCount} night${nightCount !== 1 ? 's' : ''}.`),
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
    const pageHeight = estimateDayHeight(day, validImages);

    const imageElements = validImages.map((img: any, idx: number) => {
      const el = renderImage(img, `img-${day.id}-${idx}`);
      return el;
    }).filter(Boolean);

    return React.createElement(Page, { size: [PAGE_WIDTH, pageHeight], style: S.page, key: day.id },
      React.createElement(View, { style: { backgroundColor: '#1a1a2e', padding: '10 24', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement(Text, { style: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' } }, 'Jae Travel Expeditions'),
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
            imageElements.length > 0 && React.createElement(View, { style: S.imgContainer },
              React.createElement(Text, { style: S.imgTitle }, '📷 Gallery'),
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

// ───────────────────────────────────────────────────────────────────────────
// GET Handler
// ───────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const itinerary = await prisma.itinerary.findUnique({
    where: { id: id },
    include: {
      booking: { include: { client: true } },
      days: { orderBy: { dayNumber: 'asc' } },
    },
  });

  if (!itinerary) return new NextResponse('Not found', { status: 404 });

  const imagesByDay: Record<string, any[]> = {};

  await Promise.all(
    itinerary.days.map(async (day: any) => {
      const imgs = await prisma.itineraryImage.findMany({
        where: { dayId: day.id },
        select: {
          id: true,
          dayId: true,
          filename: true,
          mimeType: true,
          data: true,
          caption: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      const processed = await Promise.all(imgs.map(processImageForPDF));
      imagesByDay[day.id] = processed;
    }),
  );

  const costSheet = await prisma.costSheet.findFirst({
    where: { bookingId: itinerary.booking?.id },
  });

  try {
    const buffer = await renderToBuffer(
      React.createElement(ItineraryPDF, { itinerary, costSheet, imagesByDay }) as any,
    );
    const filename = `${itinerary.title.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.pdf`;
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (e: any) {
    console.error('PDF generation error:', e);
    return new NextResponse(`PDF generation failed: ${e.message}`, { status: 500 });
  }
}