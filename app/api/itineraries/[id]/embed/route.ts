// app/api/itineraries/[id]/embed/route.ts
// Create / list / delete embed tokens for a given itinerary.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const embeds = await prisma.itineraryEmbed.findMany({
    where: { itineraryId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(embeds);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const label = body?.label || 'Public';
  const token = randomBytes(16).toString('hex');
  let expiresAt: Date | null = null;
  if (body?.expiresInDays) expiresAt = new Date(Date.now() + Number(body.expiresInDays) * 24 * 60 * 60 * 1000);
  const embed = await prisma.itineraryEmbed.create({
    data: { token, label, itineraryId: id, expiresAt },
  });
  return NextResponse.json(embed, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get('tokenId');
  if (tokenId) {
    await prisma.itineraryEmbed.deleteMany({ where: { id: tokenId, itineraryId: id } });
  }
  return NextResponse.json({ ok: true });
}
