// app/api/itineraries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const itinerary = await prisma.itinerary.findUnique({
    where: { id: id },
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const itinerary = await prisma.itinerary.findUnique({ where: { id: id } });
  if (!itinerary) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Detach images before deleting days
  await prisma.itineraryImage.updateMany({
    where: { day: { itineraryId: id } },
    data: { dayId: null },
  });

  await prisma.itineraryDay.deleteMany({ where: { itineraryId: id } });
  await prisma.itinerary.delete({ where: { id: id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // If only updating bookingId (no days provided), do a simple update
    if (!body.days) {
      const updateData: any = {};
      if (body.bookingId !== undefined) updateData.bookingId = body.bookingId || null;
      if (body.title) updateData.title = body.title;
      if (body.costingOptions !== undefined) updateData.costingOptions = body.costingOptions;
      if (body.costSheetId !== undefined) updateData.costSheetId = body.costSheetId || null;

      const itinerary = await prisma.itinerary.update({
        where: { id: id },
        data: updateData,
        include: {
          booking: { include: { client: true } },
          days: {
            orderBy: { dayNumber: 'asc' },
            include: { images: { orderBy: { createdAt: 'asc' } } },
          },
        },
      });
      return NextResponse.json(itinerary);
    }

    // Full update with days recreation — wrapped in a transaction so days are
    // only deleted if the entire update (title, costSheetId, costingOptions, days)
    // succeeds together. Previously the days were deleted first and the itinerary
    // update could fail afterwards, leaving an empty itinerary.
    const existingDays = await prisma.itineraryDay.findMany({
      where: { itineraryId: id },
      include: { images: true },
    });
    const imagesByDayNumber: Record<number, string[]> = {};
    for (const d of existingDays) {
      if (d.images.length > 0) {
        imagesByDayNumber[d.dayNumber] = d.images.map(img => img.id);
      }
    }

    const [, , itinerary] = await prisma.$transaction([
      // Detach images before deleting days (done inside the transaction)
      prisma.itineraryImage.updateMany({
        where: { day: { itineraryId: id } },
        data: { dayId: null },
      }),
      // Delete existing days
      prisma.itineraryDay.deleteMany({ where: { itineraryId: id } }),
      // Update itinerary + recreate days atomically
      prisma.itinerary.update({
        where: { id: id },
        data: {
          title: body.title,
          costingOptions: body.costingOptions !== undefined ? body.costingOptions : undefined,
          costSheetId: body.costSheetId !== undefined ? body.costSheetId || null : undefined,
          bookingId: body.bookingId !== undefined ? body.bookingId || null : undefined,
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
          booking: { include: { client: true } },
          days: { orderBy: { dayNumber: 'asc' } },
        },
      }),
    ]);

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
      where: { id: id },
      include: {
        booking: { include: { client: true } },
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
