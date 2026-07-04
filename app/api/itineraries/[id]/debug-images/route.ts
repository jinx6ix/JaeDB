// app/api/itineraries/[id]/debug-images/route.ts
// TEMPORARY DEBUG ENDPOINT — remove after confirming images load correctly
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  // 1. Fetch itinerary days
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: id },
    include: {
      days: {
        orderBy: { dayNumber: 'asc' },
        select: { id: true, dayNumber: true, destination: true },
      },
    },
  });

  if (!itinerary) return new NextResponse('Not found', { status: 404 });

  // 2. Query ItineraryImage directly for each day using correct model name
  const dayImageReport = await Promise.all(
    itinerary.days.map(async (day) => {
      const count = await prisma.itineraryImage.count({
        where: { dayId: day.id },
      });

      const images = await prisma.itineraryImage.findMany({
        where: { dayId: day.id },
        select: {
          id: true,
          mimeType: true,
          caption: true,
          filename: true,
          createdAt: true,
          data: true,
        },
      });

      return {
        dayId: day.id,
        dayNumber: day.dayNumber,
        destination: day.destination,
        imageCountInDB: count,
        images: images.map(img => ({
          id: img.id,
          filename: img.filename,
          mimeType: img.mimeType,
          caption: img.caption,
          hasData: !!img.data,
          dataLength: img.data ? img.data.length : 0,
          dataSample: img.data ? img.data.substring(0, 40) + '...' : null,
        })),
      };
    }),
  );

  return NextResponse.json({
    itineraryId: id,
    title: itinerary.title,
    totalDays: itinerary.days.length,
    summary: dayImageReport.map(d => ({
      day: d.dayNumber,
      destination: d.destination,
      imageCount: d.imageCountInDB,
    })),
    detail: dayImageReport,
  });
}