// app/api/park-fee-seasons/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all park fee seasons
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const seasons = await prisma.parkFeeSeason.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(seasons);
}

// POST — create a new park fee season
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, startDate, endDate, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Season name is required' }, { status: 400 });
    }

    const season = await prisma.parkFeeSeason.create({
      data: {
        name: name.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(season, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
