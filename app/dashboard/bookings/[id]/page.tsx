// app/dashboard/bookings/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const statusColors: Record<string, string> = {
  ENQUIRY: 'badge-enquiry', 
  QUOTED: 'badge-quoted', 
  CONFIRMED: 'badge-confirmed',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
  COMPLETED: 'badge-completed', 
  CANCELLED: 'badge-cancelled',
};

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      client: { include: { agent: true } },
      tourPackage: { include: { days: { orderBy: { dayNumber: 'asc' } } } },
      assignedTo: true,
      vouchers: { include: { property: true, vehicle: true, createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      itinerary: { include: { days: { orderBy: { dayNumber: 'asc' } } } },
      invoices: true,
    },
  });

  if (!booking) notFound();

  // CostSheets loaded separately – includes isOutdated flag
  let costSheets: any[] = [];
  try {
    costSheets = await (prisma as any).costSheet.findMany({
      where: { bookingId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        tourTitle: true, 
        numAdults: true, 
        numChildren: true, 
        currency: true, 
        totalCost: true, 
        perAdultCost: true, 
        createdAt: true,
        isOutdated: true        // ← added
      },
    });
  } catch {
    // Table not yet migrated – silently skip
  }

  const totalDays = Math.ceil(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const hasOutdatedCostSheets = costSheets.some((cs: any) => cs.isOutdated);

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Bookings</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{booking.bookingRef}</h1>
              <span className={statusColors[booking.status]}>{booking.status.replace('_', ' ')}</span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{booking.client.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/vouchers/new?type=HOTEL&bookingId=${booking.id}`} className="btn-secondary text-sm">+ Hotel Voucher</Link>
          <Link href={`/dashboard/vouchers/new?type=VEHICLE&bookingId=${booking.id}`} className="btn-secondary text-sm">+ Vehicle Voucher</Link>
          <Link href={`/dashboard/vouchers/new?type=FLIGHT&bookingId=${booking.id}`} className="btn-secondary text-sm">+ Flight Voucher</Link>
          {!booking.itinerary && (
            <Link href={`/dashboard/itineraries/new?bookingId=${booking.id}`} className="btn-secondary text-sm">+ Itinerary</Link>
          )}
          <Link href={`/dashboard/bookings/${booking.id}/edit`} className="btn-primary text-sm">Edit</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Booking info */}
        <div className="col-span-1 space-y-4">
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Booking Info</h2>
            {[
              { label: 'Client', value: booking.client.name },
              { label: 'Agent', value: booking.client.agent ? `${booking.client.agent.name}${booking.client.agent.company ? ` (${booking.client.agent.company})` : ''}` : '— Direct —' },
              { label: 'Tour', value: booking.tourPackage?.title || 'Custom Tour' },
              { label: 'Start', value: new Date(booking.startDate).toLocaleDateString('en-KE', { dateStyle: 'long' }) },
              { label: 'End', value: new Date(booking.endDate).toLocaleDateString('en-KE', { dateStyle: 'long' }) },
              { label: 'Duration', value: `${totalDays} day${totalDays !== 1 ? 's' : ''}` },
              { label: 'Adults', value: booking.numAdults },
              { label: 'Children', value: booking.numChildren },
              { label: 'Resident', value: booking.isResident ? 'Yes' : 'No' },
              { label: 'Assigned To', value: booking.assignedTo?.name || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{String(value)}</span>
              </div>
            ))}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Financials</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-bold text-gray-900">
                {booking.currency} {booking.totalAmount?.toLocaleString() || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-medium text-green-700">
                {booking.currency} {booking.paidAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-bold text-red-600">
                {booking.currency} {((booking.totalAmount || 0) - booking.paidAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {booking.specialRequirements && (
            <div className="card bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-1">Special Requirements</p>
              <p className="text-sm text-yellow-900">{booking.specialRequirements}</p>
            </div>
          )}
        </div>

        {/* Right: Vouchers + Itinerary */}
        <div className="col-span-2 space-y-4">
          {/* Cost Sheets */}
          {costSheets.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">Costing Sheets ({costSheets.length})</h2>
                  {hasOutdatedCostSheets && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      ⚠️ Some cost sheets are outdated because booking details changed. Please review and regenerate.
                    </p>
                  )}
                </div>
                <Link href="/dashboard/costing" className="text-orange-500 text-xs hover:underline">+ New Costing</Link>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Tour', 'Pax', 'Total Cost', 'Per Adult', 'Date', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {costSheets.map((cs: any) => (
                    <tr key={cs.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-800 max-w-xs truncate">{cs.tourTitle}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{cs.numAdults}A{cs.numChildren > 0 ? ` + ${cs.numChildren}C` : ''}</td>
                      <td className="px-4 py-2.5 text-xs font-mono font-bold text-gray-900">{cs.currency} {cs.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-orange-600">{cs.currency} {cs.perAdultCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(cs.createdAt).toLocaleDateString('en-KE')}</td>
                      <td className="px-4 py-2.5">
                        {cs.isOutdated ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                            ⚠️ Outdated
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">✓ Current</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href="/dashboard/costing" className="text-orange-500 hover:underline text-xs">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vouchers */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Vouchers ({booking.vouchers.length})</h2>
              <div className="flex gap-2">
                <Link href={`/dashboard/vouchers/new?type=HOTEL&bookingId=${booking.id}`} className="text-orange-500 text-xs hover:underline">+ Hotel</Link>
                <Link href={`/dashboard/vouchers/new?type=VEHICLE&bookingId=${booking.id}`} className="text-orange-500 text-xs hover:underline">+ Vehicle</Link>
              </div>
            </div>
            {booking.vouchers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No vouchers yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Voucher No', 'Type', 'Details', 'Dates', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {booking.vouchers.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{v.voucherNo}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${v.type === 'HOTEL' ? 'bg-blue-100 text-blue-700' : v.type === 'VEHICLE' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {v.hotelName || v.property?.name || v.vehicleName || v.vehicle?.name || v.flightName || v.vehicleType || '—'}
                        {v.roomType && ` · ${v.roomType}`}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {v.checkIn && new Date(v.checkIn).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                        {v.checkOut && ` – ${new Date(v.checkOut).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}`}
                        {v.pickupDate && new Date(v.pickupDate).toLocaleDateString('en-KE')}
                        {v.departureDate && new Date(v.departureDate).toLocaleDateString('en-KE')}
                      </td>
                      <td className="px-4 py-2.5 flex gap-3 items-center">
                        <a href={`/dashboard/vouchers/${v.id}`} className="text-orange-500 hover:underline text-xs">View</a>
                        <a href={`/dashboard/vouchers/${v.id}/edit`} className="text-gray-500 hover:underline text-xs">Edit</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Itinerary */}
          {booking.itinerary ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Itinerary: {booking.itinerary.title}</h2>
                <Link href={`/dashboard/itineraries/${booking.itinerary.id}`} className="text-orange-500 text-sm hover:underline">View Full →</Link>
              </div>
              <div className="space-y-2">
                {booking.itinerary.days.map(day => {
                  const meals = day.mealPlan ? JSON.parse(day.mealPlan) : {};
                  return (
                    <div key={day.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                        {day.dayNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800">{day.destination}</p>
                        {day.accommodation && <p className="text-xs text-gray-500">🏕️ {day.accommodation}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[meals.breakfast && 'B', meals.lunch && 'L', meals.dinner && 'D'].filter(Boolean).join(' · ') || 'No meals included'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card border-dashed border-2 border-gray-200 text-center py-8">
              <p className="text-gray-400 text-sm mb-3">No itinerary generated yet</p>
              <Link href={`/dashboard/itineraries/new?bookingId=${booking.id}`} className="btn-primary text-sm">
                Generate Itinerary
              </Link>
            </div>
          )}

          {/* Tour Package Days */}
          {booking.tourPackage && (
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-3">Tour Package: {booking.tourPackage.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{booking.tourPackage.durationDays} days / {booking.tourPackage.durationNights} nights</p>
              <div className="space-y-2">
                {booking.tourPackage.days.map(d => {
                  const activities = d.activities ? JSON.parse(d.activities) : [];
                  return (
                    <div key={d.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Day {d.dayNumber}</span>
                        <div>
                          <p className="font-medium text-sm text-gray-800">{d.title}</p>
                          {d.accommodation && <p className="text-xs text-gray-500 mt-0.5">🏕️ {d.accommodation}</p>}
                          {activities.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {activities.map((a: any, i: number) => (
                                <li key={i} className="text-xs text-gray-500">→ <span className="text-gray-400">{a.time}:</span> {a.description}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}