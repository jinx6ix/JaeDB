// app/dashboard/safari-rates/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function SafariRatesPage() {
  const [hotelCount, countyCount, priceCount] = await Promise.all([
    prisma.sRHotel.count(),
    prisma.sRCounty.count(),
    prisma.sRRoomPrice.count(),
  ]);

  const recentHotels = await prisma.sRHotel.findMany({
    take: 6, orderBy: { createdAt: 'desc' },
    include: { county: true, _count: { select: { roomTypes: true } } },
  });

  const starDistribution = await prisma.sRHotel.groupBy({
    by: ['stars'], _count: true, orderBy: { stars: 'desc' },
    where: { stars: { not: null } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏨 Safari Rates Manager</h1>
          <p className="text-gray-500 text-sm">Kenya hotel contract rates — {hotelCount} hotels across {countyCount} destinations</p>
        </div>
        <Link href="/dashboard/safari-rates/search" className="btn-primary">🔍 Search Rates</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hotels / Camps', value: hotelCount, icon: '🏕️', href: '/dashboard/safari-rates/hotels' },
          { label: 'Destinations', value: countyCount, icon: '📍', href: '/dashboard/safari-rates/search' },
          { label: 'Price Entries', value: priceCount, icon: '💰', href: '/dashboard/safari-rates/prices' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '🔍 Search Rates', desc: 'Find rates by destination and dates', href: '/dashboard/safari-rates/search', color: 'bg-blue-50 border-blue-200' },
          { label: '🏨 Hotels', desc: 'Manage hotel database', href: '/dashboard/safari-rates/hotels', color: 'bg-green-50 border-green-200' },
          { label: '💰 Enter Prices', desc: 'Add contract rates', href: '/dashboard/safari-rates/prices', color: 'bg-orange-50 border-orange-200' },
          { label: '📅 Seasons', desc: 'Define hotel seasons', href: '/dashboard/safari-rates/seasons', color: 'bg-purple-50 border-purple-200' },
        ].map(item => (
          <Link key={item.href} href={item.href} className={`card border-2 ${item.color} hover:shadow-md transition-shadow`}>
            <p className="font-semibold text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Star rating distribution */}
      {starDistribution.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Hotels by Star Rating</h2>
          <div className="space-y-2">
            {starDistribution.map(s => {
              const pct = hotelCount > 0 ? Math.round((s._count / hotelCount) * 100) : 0;
              return (
                <div key={s.stars}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{'★'.repeat(s.stars || 0)} {s.stars}-star</span>
                    <span className="font-medium">{s._count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent hotels */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Hotels</h2>
          <Link href="/dashboard/safari-rates/hotels" className="text-orange-500 text-sm hover:underline">Manage all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Hotel','Category','Stars','County','Room Types'].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentHotels.map(h=>(
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{h.category||'—'}</td>
                <td className="px-4 py-2.5 text-yellow-500">{h.stars?'★'.repeat(h.stars):'—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{h.county.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{h._count.roomTypes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
