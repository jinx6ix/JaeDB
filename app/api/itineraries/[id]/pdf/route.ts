import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
  Image as PDFImage,
} from '@react-pdf/renderer';

// ── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 44,
    height: 44,
    backgroundColor: '#f97316',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  imgThumb: { width: '100%', height: 'auto', minHeight: 80, objectFit: 'cover', borderRadius: 4 },
  imgCaption: { fontSize: 7, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  footer: { backgroundColor: '#f9fafb', padding: '14 24', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerTxt: { fontSize: 8, color: '#6b7280' },
  footerBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  footerItalic: { fontSize: 8, color: '#9ca3af' },
  pageNum: { textAlign: 'right', paddingRight: 24, paddingBottom: 10, fontSize: 8, color: '#9ca3af' },
  // Cost sheet specific
  costTable: { marginTop: 12 },
  costTotal: { marginTop: 8, padding: 8, backgroundColor: '#fef3c7', borderRadius: 4 },
  optionalTable: { marginTop: 12 },
  paymentBox: { marginTop: 12, padding: 8, border: '1 solid #e5e7eb', borderRadius: 4, backgroundColor: '#f9fafb' },
});

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ItineraryPDF({ itinerary, costSheet }: { itinerary: any; costSheet: any }) {
  const b = itinerary.booking;
  const dayCount = itinerary.days.length;
  const nightCount = Math.max(0, dayCount - 1);

  // Helper: render cost items if they exist as JSON
  const costItems = costSheet?.items ? (typeof costSheet.items === 'string' ? JSON.parse(costSheet.items) : costSheet.items) : [];
  const optionalExtras = costSheet?.optionalExtras ? (typeof costSheet.optionalExtras === 'string' ? JSON.parse(costSheet.optionalExtras) : costSheet.optionalExtras) : [];

  // First page: Cover + Summary + Cost Breakdown (if costSheet exists)
  const firstPage = React.createElement(
    Page,
    { size: 'A4', style: S.page, key: 'cover' },
    // Header
    React.createElement(View, { style: S.header },
      React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 10 } },
        React.createElement(View, { style: S.headerLogo },
          React.createElement(Text, { style: S.headerLogoTx }, 'JT')
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: S.headerTitle }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.headerSub }, `Proposal Ref: #${b.bookingRef}`)
        )
      ),
      React.createElement(View, { style: S.headerRight },
        React.createElement(Text, { style: S.headerDate }, `Issued: ${fmt(new Date())}`)
      )
    ),
    // Hero bar
    React.createElement(View, { style: S.hero },
      React.createElement(Text, { style: S.heroTitle }, itinerary.title),
      React.createElement(View, { style: S.heroMeta },
        React.createElement(Text, { style: S.heroMetaTxt },
          'Tour Length: ',
          React.createElement(Text, { style: S.heroMetaVal }, `${dayCount} Days / ${nightCount} Nights`)
        ),
        React.createElement(Text, { style: S.heroMetaTxt },
          'Travelers: ',
          React.createElement(Text, { style: S.heroMetaVal }, `${b.numAdults}x ${b.isResident ? 'Residents' : 'Non-Residents'}`)
        ),
        React.createElement(Text, { style: S.heroMetaTxt },
          'Start: ',
          React.createElement(Text, { style: S.heroMetaVal }, fmt(b.startDate))
        ),
      )
    ),
    // Cover letter
    React.createElement(View, { style: S.section },
      React.createElement(Text, { style: [S.body, S.bold] }, `Dear ${b.client.name},`),
      React.createElement(Text, { style: [S.body, { marginTop: 6 }] },
        `Thank you for giving us the opportunity to prepare this custom-made quote for your ${itinerary.title}.`
      ),
      React.createElement(Text, { style: [S.body, { marginTop: 4 }] },
        `Your tour begins in ${b.startDestination || 'Nairobi'} on ${fmt(b.startDate)} and runs for ${dayCount} day${dayCount !== 1 ? 's' : ''} and ${nightCount} night${nightCount !== 1 ? 's' : ''}.`
      ),
      React.createElement(Text, { style: [S.body, { marginTop: 4 }] },
        'Please let us know if you have any questions, or if you would like any further details.'
      ),
      React.createElement(Text, { style: [S.body, { marginTop: 6 }] }, 'Best regards,'),
      React.createElement(Text, { style: [S.body, S.bold] }, 'Jae Travel Expeditions'),
    ),
    // Day by Day Summary Table
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
            React.createElement(View, { style: { width: 50, paddingHorizontal: 6 } },
              React.createElement(Text, { style: S.dayBadge }, `Day ${day.dayNumber}`)
            ),
            React.createElement(Text, { style: [S.tCell, { flex: 2, fontFamily: 'Helvetica-Bold' }] }, day.destination),
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, day.accommodation || 'No accommodation'),
            React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, mealList || '—'),
          );
        })
      )
    ),

    // COST BREAKDOWN SECTION (if costSheet exists)
    costSheet && (
      React.createElement(View, { style: S.section },
        React.createElement(Text, { style: S.sectionTitle }, 'Breakdown of Costs'),
        // Main cost items table
        costItems.length > 0 && (
          React.createElement(View, { style: S.costTable },
            React.createElement(View, { style: S.tHead },
              React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Item'),
              React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Quantity'),
              React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Unit Price'),
              React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Total'),
            ),
            ...costItems.map((item: any, idx: number) => (
              React.createElement(View, { style: S.tRow, key: idx },
                React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, item.description || item.name),
                React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, item.quantity || ''),
                React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, `$${item.unitPrice?.toFixed(2) || '0.00'}`),
                React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, `$${item.total?.toFixed(2) || '0.00'}`),
              )
            )),
            // Total row
            React.createElement(View, { style: [S.tRow, { backgroundColor: '#fef3c7' }] },
              React.createElement(Text, { style: [S.tCell, { flex: 5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }] }, 'Total in USD'),
              React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' }] }, `$${costSheet.total?.toFixed(2) || '0.00'}`),
            )
          )
        ),
        // Payment details
        costSheet.paymentInstructions && (
          React.createElement(View, { style: S.paymentBox },
            React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '💳 Payment Details'),
            React.createElement(Text, { style: S.sideTxt }, costSheet.paymentInstructions)
          )
        ),
        // Optional extras
        optionalExtras.length > 0 && (
          React.createElement(View, { style: S.optionalTable },
            React.createElement(Text, { style: S.sectionTitle }, 'Optional (not included)'),
            React.createElement(View, { style: S.tHead },
              React.createElement(Text, { style: [S.tCellHd, { flex: 2 }] }, 'Option'),
              React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Destination'),
              React.createElement(Text, { style: [S.tCellHd, { flex: 1, textAlign: 'right' }] }, 'Price'),
            ),
            ...optionalExtras.map((opt: any, idx: number) => (
              React.createElement(View, { style: S.tRow, key: idx },
                React.createElement(Text, { style: [S.tCell, { flex: 2 }] }, opt.name),
                React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, opt.destination || ''),
                React.createElement(Text, { style: [S.tCell, { flex: 1, textAlign: 'right' }] }, `$${opt.price?.toFixed(2) || '0.00'}`),
              )
            ))
          )
        ),
        // Included / Excluded lists (if stored as JSON)
        (costSheet.included || costSheet.excluded) && (
          React.createElement(View, { style: { marginTop: 12 } },
            costSheet.included && (
              React.createElement(View, null,
                React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '✓ Included'),
                React.createElement(Text, { style: S.sideTxt }, costSheet.included)
              )
            ),
            costSheet.excluded && (
              React.createElement(View, { style: { marginTop: 8 } },
                React.createElement(Text, { style: [S.sideLabel, { marginBottom: 4 }] }, '✗ Excluded'),
                React.createElement(Text, { style: S.sideTxt }, costSheet.excluded)
              )
            )
          )
        )
      )
    ),
    // Page number
    React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` })
  );

  // Day pages (fully detailed)
  const dayPages = itinerary.days.map((day: any) => {
    const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
    const activities = day.activities ? JSON.parse(day.activities) : [];
    const mealItems = [meals.breakfast && '→ Breakfast', meals.lunch && '→ Lunch', meals.dinner && '→ Dinner', meals.note && `→ ${meals.note}`].filter(Boolean);
    const images = day.images || [];

    return React.createElement(
      Page,
      { size: 'A4', style: S.page, key: day.id },
      // Mini header
      React.createElement(View, { style: { backgroundColor: '#1a1a2e', padding: '10 24', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement(Text, { style: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' } }, 'Jae Travel Expeditions'),
        React.createElement(Text, { style: { color: '#9ca3af', fontSize: 8 } }, itinerary.title)
      ),
      // Day hero
      React.createElement(View, { style: { backgroundColor: '#f97316', padding: '10 24', flexDirection: 'row', alignItems: 'center', gap: 8 } },
        React.createElement(Text, { style: { backgroundColor: '#fff', color: '#f97316', fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '3 7', borderRadius: 10 } }, `Day ${day.dayNumber}`),
        React.createElement(Text, { style: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' } }, day.destination),
        day.date && React.createElement(Text, { style: { color: '#fed7aa', fontSize: 8, marginLeft: 'auto' } }, fmt(day.date))
      ),
      // Main content
      React.createElement(View, { style: S.daySection },
        React.createElement(View, { style: S.dayGrid },
          // Left column
          React.createElement(View, { style: S.dayMain },
            day.notes && React.createElement(Text, { style: [S.body, { marginBottom: 8 }] }, day.notes),
            activities.length > 0 && React.createElement(View, { style: S.actBox },
              React.createElement(Text, { style: S.actTitle }, 'Activities'),
              ...activities.map((a: any, i: number) =>
                React.createElement(Text, { key: i, style: S.actItem },
                  a.time ? React.createElement(Text, { style: S.actTime }, `${a.time}: `) : null,
                  `→ ${a.description}`
                )
              )
            ),
            // ALL images (no slice)
            images.length > 0 && React.createElement(View, { style: S.imgContainer },
              React.createElement(Text, { style: S.imgTitle }, '📷 Gallery'),
              React.createElement(View, { style: S.imgRow },
                images.map((img: any) =>
                  React.createElement(View, { key: img.id, style: S.imgCell },
                    React.createElement(PDFImage, {
                      src: `data:${img.mimeType};base64,${img.data}`,
                      style: S.imgThumb,
                    }),
                    img.caption && React.createElement(Text, { style: S.imgCaption }, img.caption)
                  )
                )
              )
            )
          ),
          // Right column
          React.createElement(View, { style: S.daySide },
            day.accommodation && React.createElement(View, { style: S.sideCard },
              React.createElement(Text, { style: S.sideLabel }, '🏕 Accommodation'),
              React.createElement(Text, { style: S.sideTxt }, day.accommodation)
            ),
            mealItems.length > 0 && React.createElement(View, { style: S.sideCard },
              React.createElement(Text, { style: S.sideLabel }, '🍽 Meals'),
              ...mealItems.map((m, i) => React.createElement(Text, { key: i, style: S.sideTxt }, m))
            )
          )
        )
      ),
      // Footer (non-absolute)
      React.createElement(View, { style: S.footer },
        React.createElement(View, { style: S.footerLeft },
          React.createElement(Text, { style: S.footerBold }, 'Jae Travel Expeditions'),
          React.createElement(Text, { style: S.footerTxt }, 'jaetravelexpeditions@gmail.com'),
          React.createElement(Text, { style: S.footerTxt }, 'www.jaetravel.co.ke'),
        ),
        React.createElement(View, { style: S.footerRight },
          React.createElement(Text, { style: S.footerItalic }, '"Live life with no excuses, travel with no regret"'),
        )
      ),
      React.createElement(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` })
    );
  });

  return React.createElement(Document, { title: itinerary.title }, [firstPage, ...dayPages]);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const itinerary = await prisma.itinerary.findUnique({
    where: { id: params.id },
    include: {
      booking: { include: { client: true } },
      days: {
        orderBy: { dayNumber: 'asc' },
        include: { images: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });

  if (!itinerary) return new NextResponse('Not found', { status: 404 });

  // Fetch the cost sheet linked to the same booking
  const costSheet = await prisma.costSheet.findFirst({
    where: { bookingId: itinerary.booking.id },
  });

  try {
    const buffer = await renderToBuffer(React.createElement(ItineraryPDF, { itinerary, costSheet }) as any);
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