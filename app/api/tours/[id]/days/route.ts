// app/api/tours/[id]/days/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // Delete existing days first
    await prisma.tourDay.deleteMany({ where: { tourPackageId: params.id } });

    // Create new days
    const days = await Promise.all(
      body.days.map((d: any) =>
        prisma.tourDay.create({
          data: {
            tourPackageId: params.id,
            dayNumber: d.dayNumber,
            title: d.title,
            description: d.description || null,
            accommodation: d.accommodation || null,
            mealPlan: d.mealPlan || null,
            activities: d.activities || null,
          },
        })
      )
    );

    return NextResponse.json(days, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
