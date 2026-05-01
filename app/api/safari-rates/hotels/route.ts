// app/api/safari-rates/hotels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const destinationId = searchParams.get('destinationId');
  const dateStr = searchParams.get('date');
  const boardBasis = searchParams.get('boardBasis');
  const sort = searchParams.get('sort'); // 'price_asc' or 'price_desc'

  // If no filters, return standard hotel list (original behavior)
  if (!destinationId && !dateStr && !boardBasis) {
    const hotels = await prisma.sRHotel.findMany({
      orderBy: [{ county: { name: 'asc' } }, { stars: 'desc' }, { name: 'asc' }],
      include: { county: true, _count: { select: { roomTypes: true } } },
    });
    return NextResponse.json(hotels);
  }

  // Validate required params for pricing
  if (!destinationId || !dateStr || !boardBasis) {
    return NextResponse.json({ error: 'Missing required parameters: destinationId, date, boardBasis' }, { status: 400 });
  }

  const targetDate = new Date(dateStr);
  const destinationIdNum = Number(destinationId);

  // Fetch all hotels in the destination
  const hotels = await prisma.sRHotel.findMany({
    where: { countyId: destinationIdNum },
    include: { county: true, seasons: true, roomTypes: { include: { prices: true } } },
  });

  // For each hotel, find the applicable season and cheapest price
  const hotelsWithMinRate = [];
  for (const hotel of hotels) {
    // Find season that contains the target date
    const activeSeason = hotel.seasons.find(season => 
      season.startDate <= targetDate && season.endDate >= targetDate
    );
    if (!activeSeason) continue; // no pricing for this date

    // Find all prices for that season and board basis
    const relevantPrices = [];
    for (const roomType of hotel.roomTypes) {
      const price = roomType.prices.find(p => 
        p.seasonId === activeSeason.id && p.boardBasis === boardBasis
      );
      if (price && price.ratePerPersonSharing !== null && price.ratePerPersonSharing !== undefined) {
        relevantPrices.push(price.ratePerPersonSharing);
      }
    }
    if (relevantPrices.length === 0) continue;

    const minRate = Math.min(...relevantPrices);
    // Clone hotel data without nested relations (except county for display)
    const hotelData = {
      id: hotel.id,
      name: hotel.name,
      stars: hotel.stars,
      category: hotel.category,
      county: hotel.county,
      minRate,
    };
    hotelsWithMinRate.push(hotelData);
  }

  // Sort by minRate
  if (sort === 'price_asc') {
    hotelsWithMinRate.sort((a, b) => a.minRate - b.minRate);
  } else if (sort === 'price_desc') {
    hotelsWithMinRate.sort((a, b) => b.minRate - a.minRate);
  }

  return NextResponse.json(hotelsWithMinRate);
}

// POST remains unchanged
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const hotel = await prisma.sRHotel.create({
    data: { countyId: Number(body.countyId), name: body.name, stars: body.stars ? Number(body.stars) : null, category: body.category || null },
    include: { county: true },
  });
  return NextResponse.json(hotel, { status: 201 });
}