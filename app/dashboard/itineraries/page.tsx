// app/dashboard/itineraries/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DeleteItineraryButton from '@/components/DeleteItineraryButton';

export const dynamic = 'force-dynamic';

export default async function ItinerariesPage() {
  const itineraries = await prisma.itinerary.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { include: { client: true } },
      days: { orderBy: { dayNumber: 'asc' }, take: 1 },
      _count: { select: { days: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Itineraries</h1>
          <p className="text-gray-500 text-sm mt-0.5">{itineraries.length} itinerar{itineraries.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <Link href="/dashboard/itineraries/new" className="btn-primary">+ Generate Itinerary</Link>
      </div>

      <div className="grid gap-4">
        {itineraries.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🗺️</p>
            <p>No itineraries yet. Create one from a booking.</p>
            <Link href="/dashboard/itineraries/new" className="btn-primary mt-4 inline-block">Generate First Itinerary</Link>
          </div>
        )}
        {itineraries.map(it => (
          <div key={it.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{it.title}</h3>
                  {it.booking ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Linked</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Standalone</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {it.booking ? `${it.booking.bookingRef} · ${it.booking.client?.name}` : 'Not linked to a booking'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {it._count.days} day{it._count.days !== 1 ? 's' : ''}
                  {it.days[0] && ` · Starts: ${it.days[0].destination}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/itineraries/${it.id}`} className="btn-secondary text-sm">View</Link>
                <DeleteItineraryButton id={it.id} title={it.title} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
