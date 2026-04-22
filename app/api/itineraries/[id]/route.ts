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
      days: { orderBy: { dayNumber: 'asc' } },
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
      include: { days: { orderBy: { dayNumber: 'asc' } } },
    });

    return NextResponse.json(itinerary);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
