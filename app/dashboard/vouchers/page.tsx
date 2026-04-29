import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function VouchersPage({ searchParams }: { searchParams: { type?: string } }) {
  const { type } = searchParams;

  const vouchers = await prisma.voucher.findMany({
    where: type ? { type: type as any } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: { include: { client: true } },
      property: true,
      vehicle: true,
      createdBy: true,
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/vouchers/amend" className="btn-secondary">✏️ Amend / Cancel</Link>
          <Link href="/dashboard/vouchers/new?type=HOTEL" className="btn-secondary">+ Hotel</Link>
          <Link href="/dashboard/vouchers/new?type=VEHICLE" className="btn-secondary">+ Vehicle</Link>
          <Link href="/dashboard/vouchers/new?type=FLIGHT" className="btn-primary">+ Flight</Link>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {[['All', ''], ['Hotel', 'HOTEL'], ['Vehicle', 'VEHICLE'], ['Flight', 'FLIGHT']].map(([label, val]) => (
          <Link
            key={val}
            href={`/dashboard/vouchers${val ? `?type=${val}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              (type || '') === val ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Voucher No', 'Type', 'Client', 'Provider / Details', 'Check-in / Date', 'Nights', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vouchers.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">No vouchers found</td></tr>
            )}
            {vouchers.map((v) => {
              let providerText = '—';
              if (v.type === 'HOTEL') {
                providerText = v.hotelName || v.property?.name || '—';
              } else if (v.type === 'VEHICLE') {
                providerText = v.vehicle?.name || v.vehicleName || v.vehicleType || '—';
              } else if (v.type === 'FLIGHT') {
                providerText = v.flightName || '—';
              }
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{v.voucherNo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.type === 'HOTEL' ? 'bg-blue-100 text-blue-700' : v.type === 'FLIGHT' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'}`}>
                      {v.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{v.clientName || v.booking?.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {providerText}
                    {v.roomType && <span className="text-xs text-gray-400 ml-1">({v.roomType})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {v.checkIn && new Date(v.checkIn).toLocaleDateString('en-KE')}
                    {v.pickupDate && new Date(v.pickupDate).toLocaleDateString('en-KE')}
                    {v.departureDate && new Date(v.departureDate).toLocaleDateString('en-KE')}
                    {!v.checkIn && !v.pickupDate && !v.departureDate && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.type === 'HOTEL' ? (v.numNights ?? '—') : v.type === 'FLIGHT' ? (v.numDays ?? '—') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={v.status === 'ACTIVE' ? 'badge-confirmed' : v.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-completed'}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/vouchers/${v.id}`} className="text-orange-500 hover:underline text-xs">View / PDF</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}