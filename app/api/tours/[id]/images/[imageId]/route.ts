// app/api/tours/[id]/images/[imageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return session;
}

async function requireAdmin(session: any) {
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function findImage(tourId: string, imageId: string) {
  return prisma.tourImage.findFirst({
    where: { id: imageId, tourPackageId: tourId },
    select: { id: true, filename: true, mimeType: true, data: true, caption: true, isCover: true, createdAt: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const image = await findImage(id, imageId);
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = Buffer.from(image.data, 'base64');
  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': image.mimeType || 'image/jpeg',
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(buffer.byteLength),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const adminErr = await requireAdmin(session);
  if (adminErr) return adminErr;

  try {
    const body = await req.json();
    if (body.isCover !== true) {
      return NextResponse.json({ error: 'isCover must be true' }, { status: 400 });
    }

    const image = await findImage(id, imageId);
    if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.tourImage.updateMany({ where: { tourPackageId: id }, data: { isCover: false } }),
      prisma.tourImage.update({ where: { id: imageId }, data: { isCover: true } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to set cover' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const adminErr = await requireAdmin(session);
  if (adminErr) return adminErr;

  try {
    const image = await findImage(id, imageId);
    if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const wasCover = !!image.isCover;

    const remaining = await prisma.tourImage.findMany({
      where: { tourPackageId: id, NOT: { id: imageId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.tourImage.delete({ where: { id: imageId } }),
      ...(wasCover && remaining.length > 0
        ? [prisma.tourImage.update({ where: { id: remaining[0].id }, data: { isCover: true } })]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to delete image' }, { status: 500 });
  }
}
