// app/api/rate-cards/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const rateCards = await prisma.rateCard.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tourPackage: true },
  });

  const rows: string[][] = [];

  rows.push(['Tour Package', 'Season', 'Valid From', 'Valid To', '2 Pax', '4 Pax', '6 Pax', '8 Pax', 'Markup %', 'Currency']);

  rateCards.forEach(rc => {
    rows.push([
      escapeCSV(rc.tourPackage.title),
      escapeCSV(rc.season),
      escapeCSV(new Date(rc.validFrom).toLocaleDateString()),
      escapeCSV(new Date(rc.validTo).toLocaleDateString()),
      escapeCSV(rc.basedOn2),
      escapeCSV(rc.basedOn4),
      escapeCSV(rc.basedOn6),
      escapeCSV(rc.basedOn8),
      escapeCSV(rc.markupPercent),
      escapeCSV(rc.currency),
    ]);
  });

  const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rate_cards.csv"',
    },
  });
}