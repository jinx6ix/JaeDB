// app/api/tours/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tours = await prisma.tourPackage.findMany({
    where: { isActive: true },
    orderBy: { title: 'asc' },
    include: { days: { orderBy: { dayNumber: 'asc' } } },
  });

  return NextResponse.json(tours);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const tour = await prisma.tourPackage.create({
      data: {
        title: body.title,
        description: body.description || null,
        durationDays: Number(body.durationDays),
        durationNights: Number(body.durationNights),
        countries: JSON.stringify(body.countries || ['KENYA']),
        highlights: body.highlights ? JSON.stringify(body.highlights) : null,
      },
    });
    return NextResponse.json(tour, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
