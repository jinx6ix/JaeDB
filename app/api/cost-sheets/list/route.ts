import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';   // <-- import the namespace

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { bookingRef: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { tourTitle: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { agent: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ],
      }
    : {};

  const [costSheets, totalCount] = await prisma.$transaction([
    prisma.costSheet.findMany({
      where,
      include: {
        client: { select: { name: true } },
        agent: { select: { name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.costSheet.count({ where }),
  ]);

  return NextResponse.json({
    data: costSheets,
    pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
  });
}