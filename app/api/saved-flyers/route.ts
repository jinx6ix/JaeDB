// app/api/saved-flyers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all saved flyers
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const flyers = await prisma.savedFlyer.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(flyers);
}

// POST — save a new flyer
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reqBody = await req.json();
    const {
      title, subtitle, body, price, contact, buttonText,
      formatId, templateId, bgColor, textColor, accentColor,
      imagePosition, selectedImage, logoUrl,
    } = reqBody;

    const flyer = await prisma.savedFlyer.create({
      data: {
        title: title || null,
        subtitle: subtitle || null,
        body: body || null,
        price: price || null,
        contact: contact || null,
        buttonText: buttonText || 'Book Now',
        formatId: formatId || 'a4',
        templateId: templateId || 'classic',
        bgColor: bgColor || '#ffffff',
        textColor: textColor || '#111827',
        accentColor: accentColor || '#f97316',
        imagePosition: imagePosition || 'top',
        selectedImage: selectedImage || null,
        logoUrl: logoUrl || null,
      },
    });
    return NextResponse.json(flyer, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — delete a saved flyer
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await prisma.savedFlyer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
