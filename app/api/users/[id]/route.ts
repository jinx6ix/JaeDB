// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const data: any = {
      name: body.name,
      email: body.email,
      role: body.role,
      isActive: body.isActive,
    };
    if (body.password && body.password.trim().length > 0) {
      data.password = await bcrypt.hash(body.password, 12);
    }
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return NextResponse.json(user);
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
