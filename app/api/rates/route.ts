// app/api/rates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tourId = searchParams.get('tourId');

  const rates = await prisma.rateCard.findMany({
    where: tourId ? { tourPackageId: tourId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { tourPackage: true },
  });

  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const rate = await prisma.rateCard.create({
      data: {
        tourPackageId: body.tourPackageId,
        season: body.season,
        validFrom: new Date(body.validFrom),
        validTo: new Date(body.validTo),
        basedOn2: Number(body.basedOn2),
        basedOn4: Number(body.basedOn4),
        basedOn6: Number(body.basedOn6),
        basedOn8: Number(body.basedOn8),
        basedOn10: body.basedOn10 ? Number(body.basedOn10) : null,
        basedOn12: body.basedOn12 ? Number(body.basedOn12) : null,
        markupPercent: Number(body.markupPercent) || 10,
        currency: body.currency || 'USD',
        includes: body.includes || null,
        excludes: body.excludes || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(rate, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
