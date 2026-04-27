// app/dashboard/tours/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ToursPage() {
  const tours = await prisma.tourPackage.findMany({
    orderBy: { title: 'asc' },
    include: {
      days: { orderBy: { dayNumber: 'asc' } },
      _count: { select: { bookings: true, rateCards: true } },
    },
  });

  const countryFlags: Record<string, string> = {
    KENYA: '🇰🇪', TANZANIA: '🇹🇿', UGANDA: '🇺🇬',
    RWANDA: '🇷🇼', ETHIOPIA: '🇪🇹', BURUNDI: '🇧🇮', SOUTH_SUDAN: '🇸🇸',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Packages</h1>
          <p className="text-gray-500 text-sm mt-0.5">{tours.length} package{tours.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/tours/new" className="btn-primary">+ New Tour Package</Link>
      </div>

      <div className="grid gap-4">
        {tours.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🦁</p>
            <p>No tour packages yet.</p>
            <Link href="/dashboard/tours/new" className="btn-primary mt-4 inline-block">Create First Tour</Link>
          </div>
        )}
        {tours.map(tour => {
          const countries: string[] = JSON.parse(tour.countries || '[]');
          const highlights: string[] = tour.highlights ? JSON.parse(tour.highlights) : [];

          return (
            <div key={tour.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{tour.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tour.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tour.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span>⏱ {tour.durationDays} day{tour.durationDays !== 1 ? 's' : ''} / {tour.durationNights} night{tour.durationNights !== 1 ? 's' : ''}</span>
                    <span>📋 {tour._count.bookings} booking{tour._count.bookings !== 1 ? 's' : ''}</span>
                    <span>💰 {tour._count.rateCards} rate card{tour._count.rateCards !== 1 ? 's' : ''}</span>
                    <span>{countries.map(c => countryFlags[c] || c).join(' ')}</span>
                  </div>
                  {tour.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tour.description}</p>
                  )}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {highlights.map((h, i) => (
                        <span key={i} className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full text-xs">{h}</span>
                      ))}
                    </div>
                  )}
                  {/* Day summary */}
                  {tour.days.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {tour.days.map(d => (
                        <div key={d.id} className="flex-shrink-0 text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[80px]">
                          <p className="text-xs font-bold text-orange-600">Day {d.dayNumber}</p>
                          <p className="text-xs text-gray-600 truncate max-w-[100px]">{d.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <Link href={`/dashboard/tours/${tour.id}`} className="btn-secondary text-sm">View</Link>
                  <Link href={`/dashboard/tours/${tour.id}/edit`} className="btn-secondary text-sm">Edit</Link>
                  <Link href={`/dashboard/costing/new?tourId=${tour.id}`} className="btn-secondary text-sm">+ Rate</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
