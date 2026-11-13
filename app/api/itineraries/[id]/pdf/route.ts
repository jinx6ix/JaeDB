// app/api/itineraries/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { clientPropertyFilename } from '@/lib/filename';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ItineraryPDF, processImageForPDF } from '@/lib/itinerary-pdf';

// ───────────────────────────────────────────────────────────────────────────
// GET Handler (session-protected download)
// ───────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const paxParam = searchParams.get('pax');

  return generatePdfResponse(id, paxParam ? Number(paxParam) : undefined);
}

async function generatePdfResponse(id: string, selectedPax?: number) {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: id },
    include: {
      booking: { include: { client: true } },
      days: { orderBy: { dayNumber: 'asc' } },
    },
  });

  if (!itinerary) return new NextResponse('Not found', { status: 404 });

  // Fetch destination (county) and hotel images for galleries
  let counties: any[] = [];
  let hotels: any[] = [];
  try {
    counties = await prisma.sRCounty.findMany({ include: { images: { orderBy: { createdAt: 'asc' } } } });
  } catch { /* ignore */ }
  try {
    hotels = await prisma.sRHotel.findMany({ include: { images: { orderBy: { createdAt: 'asc' } } } });
  } catch { /* ignore */ }

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

  // Use the explicitly linked cost sheet if set, otherwise fall back to the first cost sheet on the booking.
  let costSheet = null;
  if (itinerary.costSheetId) {
    costSheet = await prisma.costSheet.findUnique({ where: { id: itinerary.costSheetId } });
  }
  if (!costSheet && itinerary.booking?.id) {
    costSheet = await prisma.costSheet.findFirst({
      where: { bookingId: itinerary.booking.id },
    });
  }

  // Determine selected pax costing
  const rawOptions = itinerary.costingOptions;
  const costingOptions = (() => {
    if (Array.isArray(rawOptions)) return rawOptions;
    if (typeof rawOptions === 'string' && rawOptions.trim().length > 0) {
      try { return JSON.parse(rawOptions); } catch { return []; }
    }
    return [];
  })();
  const selectedPaxCosting = selectedPax !== undefined
    ? costingOptions.find((o: any) => o.pax === selectedPax)
    : costingOptions.length > 0 ? costingOptions[0] : undefined;

  try {
    const buffer = await renderToBuffer(
      React.createElement(ItineraryPDF, { itinerary, costSheet, imagesByDay, counties, hotels, selectedPaxCosting }) as any,
    );
    const clientName = itinerary.booking?.client?.name || '';
    const propertyName = itinerary.title || itinerary.booking?.bookingRef || '';
    const filename = clientPropertyFilename(clientName, propertyName, '.pdf') || `${itinerary.title.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.pdf`;
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
