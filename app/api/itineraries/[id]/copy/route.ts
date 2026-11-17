// app/api/itineraries/[id]/copy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Load the source itinerary with all its days
    const source = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { images: true },
        },
      },
    });
    if (!source) return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });

    // Create the copy as a standalone itinerary (no booking link) so it can be edited freely
    const copy = await prisma.itinerary.create({
      data: {
        title: `Copy of ${source.title}`,
        bookingId: null,
        included: source.included || null,
        excluded: source.excluded || null,
        costingOptions: source.costingOptions || null,
        days: {
          create: source.days.map((d) => ({
            dayNumber: d.dayNumber,
            date: d.date ? new Date(d.date) : null,
            destination: d.destination,
            accommodation: d.accommodation || null,
            mealPlan: d.mealPlan || null,
            activities: d.activities || null,
            notes: d.notes || null,
            images: {
              create: d.images.map((img) => ({
                filename: img.filename,
                mimeType: img.mimeType,
                data: img.data,
                caption: img.caption || null,
              })),
            },
          })),
        },
      },
      include: { days: { orderBy: { dayNumber: 'asc' }, include: { images: true } } },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (e: any) {
    console.error('Itinerary copy error:', e);
    return NextResponse.json({ error: e.message || 'Failed to copy itinerary' }, { status: 500 });
  }
}
