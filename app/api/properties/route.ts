import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch from SRHotel with county relation
  const hotels = await prisma.sRHotel.findMany({
    include: { county: true },
    orderBy: { name: 'asc' }
  });

  // Map to the format the frontend expects: { id, name, location }
  const properties = hotels.map(h => ({
    id: String(h.id),
    name: h.name,
    location: h.county?.name || null
  }));

  return NextResponse.json(properties);
}

// POST remains unchanged (creates a Property record, not SRHotel)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const property = await prisma.property.create({
      data: {
        name: body.name,
        type: body.type || 'CAMP',
        location: body.location || null,
        country: body.country || 'KENYA',
        category: Number(body.category) || 3,
        contactName: body.contactName || null,
        phone: body.phone || null,
        email: body.email || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(property, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}