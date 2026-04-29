// app/dashboard/costing/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import RateCalculator from './RateCalculator';

export default async function RatesPage() {
  const [tours, rateCards, clients, agents, bookings, hotels, destinations] = await Promise.all([
    prisma.tourPackage.findMany({ where: { isActive: true }, orderBy: { title: 'asc' } }),
    prisma.rateCard.findMany({ orderBy: { createdAt: 'desc' }, include: { tourPackage: true } }),
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, agentId: true, agent: { select: { id: true, name: true, company: true } } },
    }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, company: true } }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, bookingRef: true, clientId: true, tourPackageId: true, client: { select: { name: true } } },
    }),
    prisma.sRHotel.findMany({
      orderBy: [{ county: { name: 'asc' } }, { stars: 'desc' }, { name: 'asc' }],
      include: { county: { select: { id: true, name: true } } },
    }),
    prisma.sRCounty.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rates & Costing</h1>
          <p className="text-gray-500 text-sm mt-0.5">Build a linked costing sheet for any client</p>
        </div>
        <Link href="/dashboard/costing/new" className="btn-primary">+ New Rate Card</Link>
      </div>

      {/* Interactive Cost Calculator */}
      <RateCalculator
        tours={tours as any[]}
        rateCards={rateCards as any[]}
        clients={clients as any[]}
        agents={agents as any[]}
        bookings={bookings as any[]}
        hotels={hotels as any[]}
        destinations={destinations as any[]}
      />

      {/* Rate Cards Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Rate Cards</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Tour', 'Season', 'Valid Period', '2 Pax', '4 Pax', '6 Pax', '8 Pax', 'Markup', 'Currency', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rateCards.length === 0 && (
              <tr><td colSpan={10} className="text-center text-gray-400 py-8">No rate cards yet</td></tr>
            )}
            {rateCards.map(rc => (
              <tr key={rc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800 max-w-xs">
                  <p className="font-medium truncate">{rc.tourPackage.title}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    rc.season === 'HIGH' ? 'bg-red-100 text-red-700' :
                    rc.season === 'LOW' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{rc.season}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(rc.validFrom).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })} –{' '}
                  {new Date(rc.validTo).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                {[rc.basedOn2, rc.basedOn4, rc.basedOn6, rc.basedOn8].map((v, i) => (
                  <td key={i} className="px-4 py-3 text-gray-700 font-mono">{v.toLocaleString()}</td>
                ))}
                <td className="px-4 py-3 text-gray-600">{rc.markupPercent}%</td>
                <td className="px-4 py-3 text-gray-600">{rc.currency}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/dashboard/costing/${rc.id}/edit`} className="text-orange-500 hover:underline text-xs">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
