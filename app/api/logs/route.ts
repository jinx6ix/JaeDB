// app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = level ? { level } : {};
  if (q) {
    where.OR = [
      { message: { contains: q, mode: 'insensitive' } },
      { userEmail: { contains: q, mode: 'insensitive' } },
      { context: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.log.count({ where }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { level = 'INFO', message, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const userId = (session.user as any)?.id;
    const userEmail = (session.user as any)?.email;

    let contextString: string | null = null;
    if (context) {
      contextString = typeof context === 'string' ? context : JSON.stringify(context);
    }

    const log = await prisma.log.create({
      data: {
        level,
        message,
        context: contextString,
        userId: userId || null,
        userEmail: userEmail || null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get('before');

  try {
    if (before) {
      const result = await prisma.log.deleteMany({
        where: { createdAt: { lt: new Date(before) } },
      });
      return NextResponse.json({ deleted: result.count });
    }

    await prisma.log.deleteMany({});
    return NextResponse.json({ deleted: 'all' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}