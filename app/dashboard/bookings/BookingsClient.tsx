'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/SearchInput';
import DeleteBookingButton from '@/components/DeleteBookingButton';
import { BookOpen, PlusCircle } from 'lucide-react';

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
  ENQUIRY:     'badge-enquiry',
  QUOTED:      'badge-quoted',
  CONFIRMED:   'badge-confirmed',
  IN_PROGRESS: 'badge-inprogress',
  COMPLETED:   'badge-completed',
  CANCELLED:   'badge-cancelled',
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
  const router = useRouter();
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
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
            {query || status !== 'ALL' ? ` of ${bookings.length}` : ''}
          </p>
        </div>
        <Link href="/dashboard/bookings/new" className="btn-primary">
          <PlusCircle size={16} /> New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ref, client, tour, assignee…"
          widthClass="w-full sm:max-w-sm"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                status === s
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['Ref', 'Client', 'Tour', 'Dates', 'Pax', 'Amount', 'Assigned To', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No bookings found</p>
                </td>
              </tr>
            )}
            {filtered.map((b) => (
              <tr
                key={b.id}
                onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                className="cursor-pointer"
              >
                <td className="font-mono text-xs font-semibold text-gray-600">{b.bookingRef}</td>
                <td className="font-semibold text-gray-900">{b.client.name}</td>
                <td className="text-gray-500 max-w-[180px]">
                  <span className="truncate block">{b.tourPackage?.title || 'Custom'}</span>
                </td>
                <td className="text-gray-400 text-xs whitespace-nowrap">
                  {new Date(b.startDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                  {' – '}
                  {new Date(b.endDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="text-gray-600 text-xs">{b.numAdults}A{b.numChildren > 0 ? ` ${b.numChildren}C` : ''}</td>
                <td className="text-gray-700 text-xs font-mono whitespace-nowrap">
                  {b.totalAmount ? `${b.currency} ${b.totalAmount.toLocaleString()}` : '—'}
                </td>
                <td className="text-gray-400 text-xs">{b.assignedTo?.name || '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <span className={statusColors[b.status]}>{b.status.replace('_', ' ')}</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 items-center justify-end">
                    <Link href={`/dashboard/bookings/${b.id}`} className="text-orange-500 hover:text-orange-600 text-xs font-medium">View</Link>
                    {isAdmin && <DeleteBookingButton bookingId={b.id} bookingRef={b.bookingRef} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-10">
            <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No bookings found</p>
          </div>
        )}
        {filtered.map((b) => (
          <div
            key={b.id}
            onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
            className="card cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-semibold text-gray-500">{b.bookingRef}</span>
                  <span className={statusColors[b.status]}>{b.status.replace('_', ' ')}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">{b.client.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{b.tourPackage?.title || 'Custom Tour'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  <span>
                    {new Date(b.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(b.endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span>{b.numAdults} adult{b.numAdults !== 1 ? 's' : ''}{b.numChildren > 0 ? `, ${b.numChildren} child${b.numChildren !== 1 ? 'ren' : ''}` : ''}</span>
                  {b.totalAmount && (
                    <span className="font-semibold text-gray-600">{b.currency} {b.totalAmount.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                {isAdmin && <DeleteBookingButton bookingId={b.id} bookingRef={b.bookingRef} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
