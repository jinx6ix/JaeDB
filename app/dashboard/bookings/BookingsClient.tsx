'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import DeleteBookingButton from '@/components/DeleteBookingButton';

interface BookingRow {
  id: string;
  bookingRef: string;
  status: string;
  startDate: string;
  endDate: string;
  numAdults: number;
  numChildren: number;
  totalAmount: number | null;
  currency: string;
  client: { id: string; name: string };
  tourPackage: { id: string; title: string } | null;
  assignedTo: { id: string; name: string } | null;
}

const STATUS_OPTIONS = ['ALL', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const statusColors: Record<string, string> = {
  ENQUIRY: 'badge-enquiry', QUOTED: 'badge-quoted', CONFIRMED: 'badge-confirmed',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled',
};

export default function BookingsClient({
  bookings,
  isAdmin,
  initialStatus = 'ALL',
}: {
  bookings: BookingRow[];
  isAdmin: boolean;
  initialStatus?: string;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(initialStatus);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== 'ALL' && b.status !== status) return false;
      if (!q) return true;
      return (
        b.bookingRef.toLowerCase().includes(q) ||
        b.client?.name?.toLowerCase().includes(q) ||
        b.tourPackage?.title?.toLowerCase().includes(q) ||
        b.assignedTo?.name?.toLowerCase().includes(q)
      );
    });
  }, [bookings, query, status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
            {query || status !== 'ALL' ? ` (filtered from ${bookings.length})` : ''}
          </p>
        </div>
        <Link href="/dashboard/bookings/new" className="btn-primary">+ New Booking</Link>
      </div>

      {/* Live filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ref, client, tour, assignee…"
        />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Ref', 'Client', 'Tour', 'Dates', 'Pax', 'Amount', 'Assigned To', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-400 py-10">No bookings found</td></tr>
            )}
            {filtered.map((b) => (
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
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/dashboard/bookings/${b.id}`} className="text-orange-500 hover:underline text-xs">
                    View
                  </Link>
                  {isAdmin && (
                    <DeleteBookingButton bookingId={b.id} bookingRef={b.bookingRef} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
