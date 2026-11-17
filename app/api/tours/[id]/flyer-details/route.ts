// app/api/tours/[id]/flyer-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateFlyerFields } from '@/lib/tour-flyer-pdf';
import { safeParseJson } from '@/lib/itinerary-pdf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tour = await prisma.tourPackage.findUnique({
    where: { id },
    select: {
      id: true,
      flyerHeadline1: true,
      flyerHeadline2: true,
      flyerSubtitle: true,
      flyerHighlights: true,
    },
  });
  if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    flyerHeadline1: tour.flyerHeadline1 || null,
    flyerHeadline2: tour.flyerHeadline2 || null,
    flyerSubtitle: tour.flyerSubtitle || null,
    highlights: safeParseJson(tour.flyerHighlights),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const headline1: string = String(body.headline1 ?? '').trim();
    const headline2: string = String(body.headline2 ?? '').trim();
    const subtitle: string = String(body.subtitle ?? '').trim();
    const highlights: { title: string; description: string }[] = Array.isArray(body.highlights)
      ? body.highlights.map((h: any) => ({ title: String(h.title ?? '').trim(), description: String(h.description ?? '').trim() }))
      : [];

    const problems = validateFlyerFields({ headline1, headline2, subtitle, highlights });
    if (problems.length > 0) {
      return NextResponse.json({ problems }, { status: 422 });
    }

    const tour = await prisma.tourPackage.findUnique({ where: { id }, select: { id: true } });
    if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.tourPackage.update({
      where: { id },
      data: {
        flyerHeadline1: headline1 || null,
        flyerHeadline2: headline2 || null,
        flyerSubtitle: subtitle || null,
        flyerHighlights: JSON.stringify(highlights),
      },
      select: {
        flyerHeadline1: true,
        flyerHeadline2: true,
        flyerSubtitle: true,
        flyerHighlights: true,
      },
    });

    return NextResponse.json({
      flyerHeadline1: updated.flyerHeadline1 || null,
      flyerHeadline2: updated.flyerHeadline2 || null,
      flyerSubtitle: updated.flyerSubtitle || null,
      highlights: safeParseJson(updated.flyerHighlights),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save flyer details' }, { status: 500 });
  }
}
