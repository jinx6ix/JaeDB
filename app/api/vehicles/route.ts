// app/api/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    where: { isAvailable: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const vehicle = await prisma.vehicle.create({
      data: {
        name: body.name,
        type: body.type || 'OPEN_SIDED_JEEP',
        seats: Number(body.seats),
        regPlate: body.regPlate || null,
        ratePerDay: body.ratePerDay ? Number(body.ratePerDay) : null,
        currency: body.currency || 'KES',
        notes: body.notes || null,
      },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
