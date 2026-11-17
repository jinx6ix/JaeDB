// app/api/tours/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const images = await prisma.tourImage.findMany({
    where: { tourPackageId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, filename: true, caption: true, isCover: true, createdAt: true },
  });

  return NextResponse.json(images);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || !file) {
      return NextResponse.json({ error: 'File field "file" is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { Jimp, JimpMime } = await import('jimp');
    const image = await Jimp.read(buffer);
    if (image.width > 1800) {
      image.resize({ w: 1800 }); // scale down, never enlarge (height follows proportionally)
    }
    const jpegBuffer = await image.getBuffer(JimpMime.jpeg);
    const base64 = jpegBuffer.toString('base64'); // raw base64 in `data`, matching itinerary-images storage format

    const existing = await prisma.tourImage.findMany({
      where: { tourPackageId: id },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const isFirst = existing.length === 0;

    const created = await prisma.tourImage.create({
      data: {
        tourPackageId: id,
        filename: file.name || 'image.jpg',
        mimeType: 'image/jpeg',
        data: base64,
        caption: null,
        isCover: isFirst,
      },
      select: { id: true, filename: true, caption: true, isCover: true, createdAt: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to upload image' }, { status: 500 });
  }
}
