// app/api/destinations/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const destinationId = Number(id);
  const images = await prisma.destinationImage.findMany({
    where: { destinationId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(images);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const destinationId = Number(id);
  const body = await req.json();
  const { filename, mimeType, data, caption } = body;

  if (!filename || !mimeType || !data) {
    return NextResponse.json({ error: 'filename, mimeType and data are required' }, { status: 400 });
  }

  const image = await prisma.destinationImage.create({
    data: {
      destinationId,
      filename,
      mimeType,
      data: data.replace(/^data:image\/[^;]+;base64,/, ''),
      caption: caption || null,
    },
  });
  return NextResponse.json(image, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const imageId = req.nextUrl.searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 });

  await prisma.destinationImage.delete({ where: { id: imageId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { imageId, caption } = body;
  if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 });

  const image = await prisma.destinationImage.update({
    where: { id: imageId },
    data: { caption: caption || null },
  });
  return NextResponse.json(image);
}
