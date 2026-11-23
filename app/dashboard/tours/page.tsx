import { prisma } from '@/lib/prisma';
import ToursClient from './ToursClient';

export const dynamic = 'force-dynamic';

export default async function ToursPage() {
  const tours = await prisma.tourPackage.findMany({
    orderBy: { title: 'asc' },
    include: {
      days: { orderBy: { dayNumber: 'asc' } },
      _count: { select: { bookings: true, rateCards: true } },
    },
  });

  return <ToursClient tours={tours as any[]} />;
}
