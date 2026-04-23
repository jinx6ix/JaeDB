// app/api/itineraries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    const itinerary = await prisma.itinerary.create({
      data: {
        bookingId: body.bookingId,
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
      include: { days: { orderBy: { dayNumber: 'asc' }, include: { images: true } } },
    });

    return NextResponse.json(itinerary, { status: 201 });
  } catch (e: any) {
    console.error('Itinerary create error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
