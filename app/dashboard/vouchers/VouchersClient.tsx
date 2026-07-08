'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

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
  { label: 'All', val: '' },
  { label: 'Hotel', val: 'HOTEL' },
  { label: 'Vehicle', val: 'VEHICLE' },
  { label: 'Flight', val: 'FLIGHT' },
] as const;

export default function VouchersClient({ vouchers }: { vouchers: VoucherRow[] }) {
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} voucher{filtered.length !== 1 ? 's' : ''}
            {query || type ? ` (filtered from ${vouchers.length})` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/vouchers/amend" className="btn-secondary">✏️ Amend / Cancel</Link>
          <Link href="/dashboard/vouchers/new?type=HOTEL" className="btn-secondary">+ Hotel</Link>
          <Link href="/dashboard/vouchers/new?type=VEHICLE" className="btn-secondary">+ Vehicle</Link>
          <Link href="/dashboard/vouchers/new?type=FLIGHT" className="btn-primary">+ Flight</Link>
        </div>
      </div>

      {/* Live filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search voucher no, client, hotel, vehicle, flight…"
        />
        <div className="flex gap-1 flex-wrap">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setType(opt.val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                (type || '') === opt.val ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">No vouchers found</td></tr>
            )}
            {filtered.map((v) => {
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
