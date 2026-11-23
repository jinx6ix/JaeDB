// app/api/tours/[id]/flyer/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { TourFlyerPDF, validateFlyerFields } from '@/lib/tour-flyer-pdf';
import { safeParseJson, buildImageSrc, processImageForPDF } from '@/lib/itinerary-pdf';

function slugify(title: string): string {
  const s = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s.slice(0, 60) || 'tour_flyer';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inline = searchParams.get('inline') === '1';

  const tour = await prisma.tourPackage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      flyerHeadline1: true,
      flyerHeadline2: true,
      flyerSubtitle: true,
      flyerHighlights: true,
      images: {
        where: {},
        orderBy: { createdAt: 'desc' },
        select: { id: true, filename: true, mimeType: true, data: true, caption: true, isCover: true, createdAt: true },
      },
    },
  });
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const highlights = safeParseJson(tour.flyerHighlights);
  const input = {
    headline1: tour.flyerHeadline1 || '',
    headline2: tour.flyerHeadline2 || '',
    subtitle: tour.flyerSubtitle || '',
    highlights,
  };

  const problems = validateFlyerFields(input);
  if (problems.length > 0) {
    return NextResponse.json({ error: 'Flyer details incomplete', problems }, { status: 422 });
  }

  // Cover: isCover true image, else newest, else null.
  const coverImage = tour.images.find((img) => img.isCover) || tour.images[0] || null;
  let coverSrc: string | null = null;
  if (coverImage) {
    try {
      let processed: any = coverImage;
      try {
        processed = await processImageForPDF(coverImage);
      } catch {
        /* keep original */
      }
      coverSrc = buildImageSrc(processed);
    } catch {
      coverSrc = null;
    }
  }

  try {
    const buffer = await renderToBuffer(
      (React.createElement(TourFlyerPDF, {
        headline1: input.headline1,
        headline2: input.headline2,
        subtitle: input.subtitle,
        highlights: input.highlights,
        coverSrc,
      }) as any),
    );
    const filename = `${slugify(tour.title)}_flyer.pdf`;
    const disposition = inline ? 'inline' : 'attachment';
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (e: any) {
    console.error('Flyer PDF generation error:', e);
    return NextResponse.json({ error: e.message || 'Flyer PDF generation failed' }, { status: 500 });
  }
}
