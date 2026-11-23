'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/SearchInput';
import { Ticket, PlusCircle, PenLine, Hotel, Car, Plane } from 'lucide-react';

interface VoucherRow {
  id: string;
  voucherNo: string;
  type: string;
  status: string;
  clientName: string | null;
  hotelName: string | null;
  flightName: string | null;
  vehicleName: string | null;
  vehicleType: string | null;
  roomType: string | null;
  checkIn: string | null;
  pickupDate: string | null;
  departureDate: string | null;
  numNights: number | null;
  numDays: number | null;
  booking: { client: { name: string } | null } | null;
  property: { name: string } | null;
  vehicle: { name: string } | null;
}

const TYPE_OPTIONS = [
  { label: 'All',     val: '' },
  { label: 'Hotel',   val: 'HOTEL' },
  { label: 'Vehicle', val: 'VEHICLE' },
  { label: 'Flight',  val: 'FLIGHT' },
] as const;

const typeIcon = (t: string) => {
  if (t === 'HOTEL')   return <Hotel  size={13} className="text-blue-500" />;
  if (t === 'FLIGHT')  return <Plane  size={13} className="text-sky-500" />;
  return                      <Car    size={13} className="text-green-500" />;
};

const typeBadge = (t: string) =>
  t === 'HOTEL'  ? 'bg-blue-50  text-blue-600  ring-1 ring-blue-200/60'  :
  t === 'FLIGHT' ? 'bg-sky-50   text-sky-600   ring-1 ring-sky-200/60'   :
                   'bg-green-50 text-green-600 ring-1 ring-green-200/60';

export default function VouchersClient({ vouchers }: { vouchers: VoucherRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (type && v.type !== type) return false;
      if (!q) return true;
      const clientStr = v.clientName || v.booking?.client?.name || '';
      const providerStr =
        v.property?.name || v.vehicle?.name || v.vehicleName || v.vehicleType ||
        v.hotelName || v.flightName || '';
      return (
        v.voucherNo.toLowerCase().includes(q) ||
        clientStr.toLowerCase().includes(q) ||
        providerStr.toLowerCase().includes(q) ||
        (v.roomType || '').toLowerCase().includes(q)
      );
    });
  }, [vouchers, query, type]);

  const providerText = (v: VoucherRow) => {
    if (v.type === 'HOTEL')   return v.hotelName || v.property?.name || '—';
    if (v.type === 'VEHICLE') return v.vehicle?.name || v.vehicleName || v.vehicleType || '—';
    if (v.type === 'FLIGHT')  return v.flightName || '—';
    return '—';
  };

  const dateText = (v: VoucherRow) =>
    v.checkIn       ? new Date(v.checkIn).toLocaleDateString('en-KE')       :
    v.pickupDate    ? new Date(v.pickupDate).toLocaleDateString('en-KE')    :
    v.departureDate ? new Date(v.departureDate).toLocaleDateString('en-KE') :
    '—';

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vouchers</h1>
          <p className="page-subtitle">
            {filtered.length} voucher{filtered.length !== 1 ? 's' : ''}
            {query || type ? ` of ${vouchers.length}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/vouchers/amend" className="btn-secondary">
            <PenLine size={14} /> Amend
          </Link>
          <Link href="/dashboard/vouchers/new?type=HOTEL"   className="btn-secondary"><Hotel size={14} /> Hotel</Link>
          <Link href="/dashboard/vouchers/new?type=VEHICLE" className="btn-secondary"><Car   size={14} /> Vehicle</Link>
          <Link href="/dashboard/vouchers/new?type=FLIGHT"  className="btn-primary">  <Plane size={14} /> Flight</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search voucher no, client, hotel, vehicle…"
          widthClass="w-full sm:max-w-sm"
        />
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setType(opt.val)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                (type || '') === opt.val
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['Voucher No', 'Type', 'Client', 'Provider', 'Date', 'Nights/Days', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Ticket size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No vouchers found</p>
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr
                key={v.id}
                onClick={() => router.push(`/dashboard/vouchers/${v.id}`)}
                className="cursor-pointer"
              >
                <td className="font-mono text-xs font-semibold text-gray-700">{v.voucherNo}</td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md ${typeBadge(v.type)}`}>
                    {typeIcon(v.type)} {v.type}
                  </span>
                </td>
                <td className="text-gray-700 text-sm">{v.clientName || v.booking?.client?.name || '—'}</td>
                <td className="text-gray-500 text-sm">
                  {providerText(v)}
                  {v.roomType && <span className="text-xs text-gray-400 ml-1.5">({v.roomType})</span>}
                </td>
                <td className="text-gray-400 text-xs">{dateText(v)}</td>
                <td className="text-gray-600 text-sm text-center">
                  {v.type === 'HOTEL' ? (v.numNights ?? '—') : v.type === 'FLIGHT' ? (v.numDays ?? '—') : '—'}
                </td>
                <td>
                  <span className={v.status === 'ACTIVE' ? 'badge-confirmed' : v.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-completed'}>
                    {v.status}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/vouchers/${v.id}`} className="text-orange-500 hover:text-orange-600 text-xs font-medium whitespace-nowrap">
                    View / PDF
                  </Link>
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
            <Ticket size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No vouchers found</p>
          </div>
        )}
        {filtered.map((v) => (
          <div
            key={v.id}
            onClick={() => router.push(`/dashboard/vouchers/${v.id}`)}
            className="card cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-gray-600">{v.voucherNo}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${typeBadge(v.type)}`}>
                    {typeIcon(v.type)} {v.type}
                  </span>
                  <span className={v.status === 'ACTIVE' ? 'badge-confirmed' : v.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-completed'}>
                    {v.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {v.clientName || v.booking?.client?.name || '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {providerText(v)}
                  {v.roomType && ` · ${v.roomType}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {dateText(v)}
                  {v.type === 'HOTEL' && v.numNights && ` · ${v.numNights} night${v.numNights !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
