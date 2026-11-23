// app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all saved newsletters
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const newsletters = await prisma.newsletter.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(newsletters);
}

// POST — save a new newsletter
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reqBody = await req.json();
    const {
      title, subtitle, announcementTitle, announcementSubtitle, body,
      heroImage, items, contactEmail, contactPhone, contactWebsite,
    } = reqBody;

    const newsletter = await prisma.newsletter.create({
      data: {
        title: title || null,
        subtitle: subtitle || null,
        announcementTitle: announcementTitle || null,
        announcementSubtitle: announcementSubtitle || null,
        body: body || null,
        heroImage: heroImage || null,
        items: items || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactWebsite: contactWebsite || null,
      },
    });
    return NextResponse.json(newsletter, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
