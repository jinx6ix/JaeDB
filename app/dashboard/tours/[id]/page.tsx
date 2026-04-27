// app/dashboard/tours/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const countryFlags: Record<string, string> = {
  KENYA: '🇰🇪', TANZANIA: '🇹🇿', UGANDA: '🇺🇬',
  RWANDA: '🇷🇼', ETHIOPIA: '🇪🇹', BURUNDI: '🇧🇮', SOUTH_SUDAN: '🇸🇸',
};

export default async function TourDetailPage({ params }: { params: { id: string } }) {
  const tour = await prisma.tourPackage.findUnique({
    where: { id: params.id },
    include: {
      days: { orderBy: { dayNumber: 'asc' }, include: { destination: true } },
      rateCards: { orderBy: { season: 'asc' } },
      _count: { select: { bookings: true } },
    },
  });

  if (!tour) notFound();

  const countries: string[] = JSON.parse(tour.countries || '[]');
  const highlights: string[] = tour.highlights ? JSON.parse(tour.highlights) : [];

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tours" className="text-gray-400 hover:text-gray-600 text-sm">← Tours</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tour.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {tour.durationDays} days / {tour.durationNights} nights ·{' '}
              {countries.map(c => countryFlags[c] || c).join(' ')} ·{' '}
              {tour._count.bookings} bookings
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/costing/new?tourId=${tour.id}`} className="btn-secondary">+ Rate Card</Link>
          <Link href={`/dashboard/tours/${tour.id}/edit`} className="btn-primary">Edit</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info */}
        <div className="col-span-1 space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">Package Info</h2>
            {tour.description && <p className="text-sm text-gray-600 mb-4 leading-relaxed">{tour.description}</p>}
            {highlights.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Highlights</p>
                <div className="flex flex-wrap gap-1.5">
                  {highlights.map((h, i) => (
                    <span key={i} className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full text-xs">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rate Cards */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">Rate Cards</h2>
              <Link href={`/dashboard/costing/new?tourId=${tour.id}`} className="text-orange-500 text-xs hover:underline">+ Add</Link>
            </div>
            {tour.rateCards.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No rate cards</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {tour.rateCards.map(rc => (
                  <div key={rc.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rc.season === 'HIGH' ? 'bg-red-100 text-red-700' : rc.season === 'LOW' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {rc.season}
                      </span>
                      <span className="text-xs text-gray-400">{rc.currency}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs text-gray-600 mt-1">
                      <div className="text-center"><p className="text-gray-400">2px</p><p className="font-mono font-medium">{rc.basedOn2}</p></div>
                      <div className="text-center"><p className="text-gray-400">4px</p><p className="font-mono font-medium">{rc.basedOn4}</p></div>
                      <div className="text-center"><p className="text-gray-400">6px</p><p className="font-mono font-medium">{rc.basedOn6}</p></div>
                      <div className="text-center"><p className="text-gray-400">8px</p><p className="font-mono font-medium">{rc.basedOn8}</p></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">+{rc.markupPercent}% markup</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Days */}
        <div className="col-span-2 space-y-3">
          <h2 className="font-semibold text-gray-800">Day-by-Day Itinerary</h2>
          {tour.days.map(day => {
            const activities = day.activities ? JSON.parse(day.activities) : [];
            const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
            const mealsList = [meals.breakfast && 'B', meals.lunch && 'L', meals.dinner && 'D'].filter(Boolean);

            return (
              <div key={day.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {day.dayNumber}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{day.title}</h3>
                        {day.destination && <p className="text-sm text-orange-600">{day.destination.name}</p>}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        {day.accommodation && <span>🏕️ {day.accommodation}</span>}
                        {mealsList.length > 0 && <span>🍽️ {mealsList.join('/')}</span>}
                        {meals.note && <span className="text-gray-400">({meals.note})</span>}
                      </div>
                    </div>
                    {day.description && <p className="text-sm text-gray-600 mt-1">{day.description}</p>}
                    {activities.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {activities.map((a: any, i: number) => (
                          <p key={i} className="text-sm text-gray-600">
                            {a.time && <span className="font-medium text-gray-700">{a.time}: </span>}
                            → {a.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {tour.days.length === 0 && (
            <div className="card text-center py-8 text-gray-400 border-dashed border-2">
              <p>No days added yet.</p>
              <Link href={`/dashboard/tours/${tour.id}/edit`} className="text-orange-500 text-sm mt-2 inline-block hover:underline">Edit to add days →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
