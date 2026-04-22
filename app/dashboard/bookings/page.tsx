// app/dashboard/bookings/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const STATUS_OPTIONS = ['ALL', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const statusColors: Record<string, string> = {
  ENQUIRY: 'badge-enquiry', QUOTED: 'badge-quoted', CONFIRMED: 'badge-confirmed',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
};

export default async function BookingsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const { status = 'ALL', q = '' } = searchParams;

  const bookings = await prisma.booking.findMany({
    where: {
      ...(status !== 'ALL' ? { status: status as any } : {}),
      ...(q ? {
        OR: [
          { bookingRef: { contains: q } },
          { client: { name: { contains: q } } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { client: true, tourPackage: true, assignedTo: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/bookings/new" className="btn-primary">+ New Booking</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search ref or client…" className="input w-56" />
          <input type="hidden" name="status" value={status} />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={`/dashboard/bookings?status=${s}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Ref', 'Client', 'Tour', 'Dates', 'Pax', 'Amount', 'Assigned To', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-400 py-10">No bookings found</td></tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.bookingRef}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{b.client.name}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.tourPackage?.title || 'Custom'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(b.startDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                  {' – '}
                  {new Date(b.endDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-gray-600">{b.numAdults}A{b.numChildren > 0 ? ` ${b.numChildren}C` : ''}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {b.totalAmount ? `${b.currency} ${b.totalAmount.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{b.assignedTo?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={statusColors[b.status]}>{b.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/bookings/${b.id}`} className="text-orange-500 hover:underline text-xs">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
