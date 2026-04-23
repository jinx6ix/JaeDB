// app/api/itineraries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (!itinerary) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(itinerary);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // Before deleting, collect existing image IDs per dayNumber so we can re-link them
    const existingDays = await prisma.itineraryDay.findMany({
      where: { itineraryId: params.id },
      include: { images: true },
    });
    // Map dayNumber -> image IDs
    const imagesByDayNumber: Record<number, string[]> = {};
    for (const d of existingDays) {
      if (d.images.length > 0) {
        imagesByDayNumber[d.dayNumber] = d.images.map(img => img.id);
      }
    }

    // Detach images (set dayId null) before deleting days to avoid cascade-delete
    const allImageIds = existingDays.flatMap(d => d.images.map(img => img.id));
    if (allImageIds.length > 0) {
      await prisma.itineraryImage.updateMany({
        where: { id: { in: allImageIds } },
        data: { dayId: null },
      });
    }

    // Delete existing days and recreate
    await prisma.itineraryDay.deleteMany({ where: { itineraryId: params.id } });

    const itinerary = await prisma.itinerary.update({
      where: { id: params.id },
      data: {
        title: body.title,
        days: {
          create: body.days.map((d: any) => ({
            dayNumber: d.dayNumber,
            date: d.date ? new Date(d.date) : null,
            destination: d.destination,
            accommodation: d.accommodation || null,
            mealPlan: d.mealPlan || null,
            activities: d.activities || null,
            notes: d.notes || null,
          })),
        },
      },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
      },
    });

    // Re-link images to new day IDs by matching dayNumber
    const relinkPromises: Promise<any>[] = [];
    for (const savedDay of itinerary.days) {
      const imageIds = imagesByDayNumber[savedDay.dayNumber] || [];
      if (imageIds.length > 0) {
        relinkPromises.push(
          prisma.itineraryImage.updateMany({
            where: { id: { in: imageIds } },
            data: { dayId: savedDay.id },
          })
        );
      }
    }
    await Promise.all(relinkPromises);

    // Return itinerary with images
    const result = await prisma.itinerary.findUnique({
      where: { id: params.id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { images: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
