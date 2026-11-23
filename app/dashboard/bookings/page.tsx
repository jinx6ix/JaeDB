import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  // Load all bookings (server-side) for client-side live filtering.
  // Booking volumes stay well below the 1k hybrid threshold; if they grow,
  // switch this page to use the debounced API pattern (see Logs page).
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true, tourPackage: true, assignedTo: true },
  });

  return (
    <BookingsClient
      bookings={bookings as any[]}
      isAdmin={isAdmin}
      initialStatus={searchParams.status || 'ALL'}
    />
  );
}
