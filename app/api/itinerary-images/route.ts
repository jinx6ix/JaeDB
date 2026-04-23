// app/api/itinerary-images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all images in the library (no dayId filter = all uploads)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dayId = searchParams.get('dayId');

  const images = await prisma.itineraryImage.findMany({
    where: dayId ? { dayId } : {},
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, mimeType: true, data: true, caption: true, dayId: true, createdAt: true },
  });

  return NextResponse.json(images);
}

// POST — upload a new image (base64)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { dayId, filename, mimeType, data, caption } = body;

    if (!filename || !mimeType || !data) {
      return NextResponse.json({ error: 'filename, mimeType, and data are required' }, { status: 400 });
    }

    const image = await prisma.itineraryImage.create({
      data: {
        dayId: dayId || null,
        filename,
        mimeType,
        data,
        caption: caption || null,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
