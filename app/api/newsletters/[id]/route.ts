// app/api/newsletters/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const newsletter = await prisma.newsletter.findUnique({ where: { id } });
  if (!newsletter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(newsletter);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const reqBody = await req.json();
  const {
    title, subtitle, announcementTitle, announcementSubtitle, body,
    heroImage, items, letterSalute, letterBody, contactEmail, contactPhone, contactWebsite,
  } = reqBody;

  try {
    const newsletter = await prisma.newsletter.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        subtitle: subtitle !== undefined ? subtitle : undefined,
        announcementTitle: announcementTitle !== undefined ? announcementTitle : undefined,
        announcementSubtitle: announcementSubtitle !== undefined ? announcementSubtitle : undefined,
        body: body !== undefined ? body : undefined,
        heroImage: heroImage !== undefined ? heroImage : undefined,
        items: items !== undefined ? items : undefined,
        letterSalute: letterSalute !== undefined ? letterSalute : undefined,
        letterBody: letterBody !== undefined ? letterBody : undefined,
        contactEmail: contactEmail !== undefined ? contactEmail : undefined,
        contactPhone: contactPhone !== undefined ? contactPhone : undefined,
        contactWebsite: contactWebsite !== undefined ? contactWebsite : undefined,
      },
    });
    return NextResponse.json(newsletter);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.newsletter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
