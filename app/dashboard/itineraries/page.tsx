import { prisma } from '@/lib/prisma';
import ItinerariesClient from './ItinerariesClient';

export const dynamic = 'force-dynamic';

export default async function ItinerariesPage() {
  const itineraries = await prisma.itinerary.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { include: { client: true } },
      days: { orderBy: { dayNumber: 'asc' }, take: 1 },
      _count: { select: { days: true, embeds: true } },
    },
  });

  return <ItinerariesClient itineraries={itineraries as any[]} />;
}
