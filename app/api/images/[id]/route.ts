// app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Optional: protect with authentication if needed
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const image = await prisma.itineraryImage.findUnique({
    where: { id: params.id },
    select: { data: true, mimeType: true },
  });

  if (!image?.data) {
    return new NextResponse('Image not found', { status: 404 });
  }

  // Convert Buffer or base64 string to Buffer
  const buffer = Buffer.isBuffer(image.data)
    ? image.data
    : Buffer.from(image.data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'public, max-age=31536000', // optional cache
    },
  });
}