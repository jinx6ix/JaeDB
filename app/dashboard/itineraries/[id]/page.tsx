// app/dashboard/itineraries/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ItineraryDetailPage({ params }: { params: { id: string } }) {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: params.id },
    include: {
      booking: {
        include: {
          client: true,
          tourPackage: true,
        },
      },
      days: {
        orderBy: { dayNumber: 'asc' },
        include: { images: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });

  if (!itinerary) notFound();

  const b = itinerary.booking;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/itineraries" className="text-gray-400 hover:text-gray-600 text-sm">← Itineraries</Link>
          <h1 className="text-2xl font-bold text-gray-900">{itinerary.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/itineraries/${itinerary.id}/edit`} className="btn-secondary">Edit</Link>
          <Link href={`/api/itineraries/${itinerary.id}/pdf`} target="_blank" className="btn-primary">⬇ Download PDF</Link>
        </div>
      </div>

      {/* Itinerary document preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a2e] text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center font-bold">JT</div>
              <div>
                <p className="font-bold">Jae Travel Expeditions</p>
                <p className="text-orange-400 text-sm">Proposal Ref: #{b.bookingRef}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-300">
              <p>Esteemed Guest</p>
            </div>
          </div>
        </div>

        {/* Hero info bar */}
        <div className="bg-orange-500 px-8 py-5">
          <h2 className="text-2xl font-bold text-white">{itinerary.title}</h2>
          <div className="flex gap-8 mt-2 text-orange-100 text-sm">
            <span>Tour Length: <strong className="text-white">{itinerary.days.length} Day{itinerary.days.length !== 1 ? 's' : ''} / {Math.max(0, itinerary.days.length - 1)} Night{itinerary.days.length !== 2 ? 's' : ''}</strong></span>
            <span>Travelers: <strong className="text-white">{b.numAdults}x {b.isResident ? 'Residents' : 'Non Residents'}</strong></span>
            <span>Start: <strong className="text-white">{new Date(b.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
          </div>
        </div>

        {/* Cover letter */}
        <div className="px-8 py-6 border-b border-gray-100">
          <p className="font-semibold text-gray-800 mb-3">Dear {b.client.name},</p>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            Thank you for giving us the opportunity to prepare this custom-made quote for your {itinerary.title}.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            As you can see from our detailed proposal, your tour begins in Nairobi on {new Date(b.startDate).toLocaleDateString('en-KE', { dateStyle: 'long' })} and runs for {itinerary.days.length} day{itinerary.days.length !== 1 ? 's' : ''} and {Math.max(0, itinerary.days.length - 1)} night{itinerary.days.length !== 2 ? 's' : ''}.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Please let us know if you have any questions, or if you would like any further details.
          </p>
          <p className="text-gray-600 text-sm mt-3">Best regards,</p>
        </div>

        {/* Day-by-Day Summary Table */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg mb-4">Day by Day Summary</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Day</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Destination</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Accommodation</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Meals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itinerary.days.map((day) => {
                  const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
                  const mealsList = [
                    meals.breakfast && 'Breakfast',
                    meals.lunch && 'Lunch',
                    meals.dinner && 'Dinner',
                    meals.note && meals.note,
                  ].filter(Boolean);
                  return (
                    <tr key={day.id}>
                      <td className="px-4 py-3">
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">Day {day.dayNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{day.destination}</td>
                      <td className="px-4 py-3 text-gray-600">{day.accommodation || 'No accommodation'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{mealsList.join(' · ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Day Pages */}
        {itinerary.days.map((day) => {
          const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
          const activities = day.activities ? JSON.parse(day.activities) : [];
          const mealItems = [
            meals.breakfast && '→ Breakfast',
            meals.lunch && '→ Lunch',
            meals.dinner && '→ Dinner',
            meals.note && `→ ${meals.note}`,
          ].filter(Boolean);

          return (
            <div key={day.id} className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-start gap-2 mb-4">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Day {day.dayNumber}</span>
                <h3 className="text-xl font-bold text-gray-800">{day.destination}</h3>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  {day.notes && <p className="text-gray-600 text-sm mb-4 leading-relaxed">{day.notes}</p>}
                  {activities.length > 0 && (
                    <div className="border border-orange-100 rounded-lg p-4 bg-orange-50">
                      <p className="font-bold text-gray-800 text-sm mb-3">Activities</p>
                      <div className="space-y-2">
                        {activities.map((a: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            {a.time && <span className="font-semibold text-orange-700">{a.time}: </span>}
                            <span className="text-gray-700">→ {a.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(day as any).images?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">📷 Gallery</p>
                      <div className={`grid gap-2 ${(day as any).images.length === 1 ? 'grid-cols-1' : (day as any).images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {(day as any).images.map((img: any) => (
                          <div key={img.id} className="rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                            <img
                              src={`data:${img.mimeType};base64,${img.data}`}
                              alt={img.caption || img.filename}
                              className="w-full object-cover"
                              style={{ maxHeight: (day as any).images.length === 1 ? '300px' : '180px' }}
                            />
                            {img.caption && (
                              <p className="text-xs text-gray-500 text-center px-2 py-1 bg-gray-50">{img.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {day.accommodation && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🏕️ Accommodation</p>
                      <p className="text-sm text-gray-800">{day.accommodation}</p>
                    </div>
                  )}
                  {mealItems.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">🍽️ Meals</p>
                      {mealItems.map((m, i) => (
                        <p key={i} className="text-sm text-gray-700">{m}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">Jae Travel Expeditions</p>
              <p>Email: jaetravelexpeditions@gmail.com</p>
              <p>Website: www.jaetravel.co.ke</p>
            </div>
            <div className="text-right text-xs text-gray-400 italic">
              <p>"Live life with no excuses, travel with no regret"</p>
              <p>— Oscar Wilde</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
