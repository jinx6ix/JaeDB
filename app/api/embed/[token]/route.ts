// app/api/embed/[token]/route.ts
// Public API consumed by the iframe embed. No auth — gated only by the token.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const embed = await prisma.itineraryEmbed.findUnique({
    where: { token },
    include: { itinerary: { include: { days: { orderBy: { dayNumber: 'asc' } } } } },
  });
  if (!embed) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (embed.expiresAt && new Date(embed.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  void prisma.itineraryEmbed.update({ where: { id: embed.id }, data: { visits: { increment: 1 } } }).catch(() => null);
  return NextResponse.json({
    itineraries: embed.itinerary ? [embed.itinerary] : [],
  });
}
