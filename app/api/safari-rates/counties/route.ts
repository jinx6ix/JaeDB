import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const counties = await prisma.sRCounty.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { hotels: true } } } });
  return NextResponse.json(counties);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const county = await prisma.sRCounty.create({ data: { name: body.name, region: body.region || null } });
  return NextResponse.json(county, { status: 201 });
}
