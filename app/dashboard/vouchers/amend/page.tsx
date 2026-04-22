'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Voucher {
  id: string; voucherNo: string; type: string; clientName: string;
  issuedDate: string; bookingStatus?: string; status: string;
  hotelName?: string; flightName?: string; vehicleType?: string;
  checkIn?: string; departureDate?: string; pickupDate?: string;
  createdBy?: { name: string };
}

const STATUS_OPTS = [
  { value: 'book',   label: 'Please Book',   color: 'bg-green-600',  badge: '' },
  { value: 'amend',  label: 'Please Amend',  color: 'bg-orange-500', badge: 'AMENDED' },
  { value: 'cancel', label: 'Please Cancel', color: 'bg-red-600',    badge: 'CANCELLED' },
];

export default function AmendVoucherPage() {
  const router = useRouter();
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<Voucher[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState<Voucher | null>(null);
  const [newStatus, setNewStatus] = useState<'book'|'amend'|'cancel'>('amend');
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  async function search() {
    if (!query.trim()) return;
    setSearching(true); setError(''); setResults([]);
    try {
      const res = await fetch(`/api/vouchers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      if (!data?.length) setError(`No vouchers found for "${query}"`);
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function applyStatus() {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/vouchers/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingStatus: newStatus }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push(`/dashboard/vouchers/${selected.id}`), 1500);
      } else {
        setError('Failed to update voucher');
      }
    } catch {
      setError('Update failed');
    } finally {
      setSaving(false);
    }
  }

  const dateField = (v: Voucher) => v.checkIn || v.departureDate || v.pickupDate;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/vouchers" className="text-gray-400 hover:text-gray-600 text-sm">← Vouchers</Link>
        <h1 className="text-2xl font-bold text-gray-900">Amend / Cancel Voucher</h1>
      </div>

      {/* Search */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Search Voucher</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Voucher No (e.g. JTE120726F) or client name"
          />
          <button onClick={search} disabled={searching} className="btn-primary">
            {searching ? 'Searching…' : '🔍 Search'}
          </button>
        </div>

        {error && !selected && <p className="text-red-500 text-sm">{error}</p>}

        {results.length > 0 && !selected && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{results.length} result{results.length !== 1 ? 's' : ''} — click to select</p>
            {results.map(v => (
              <button key={v.id} onClick={() => { setSelected(v); setNewStatus(v.bookingStatus as any || 'amend'); }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-gray-800">{v.voucherNo}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${v.type === 'HOTEL' ? 'bg-blue-100 text-blue-700' : v.type === 'FLIGHT' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'}`}>{v.type}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{v.clientName}</p>
                <p className="text-xs text-gray-400">{v.hotelName || v.flightName || v.vehicleType || '—'} · {dateField(v) ? new Date(dateField(v)!).toLocaleDateString('en-KE') : '—'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected voucher + status update */}
      {selected && !done && (
        <div className="card space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.voucherNo}</h2>
              <p className="text-gray-500 text-sm">{selected.clientName} · {selected.type}</p>
              <p className="text-gray-400 text-xs">{selected.hotelName || selected.flightName || selected.vehicleType || '—'}</p>
            </div>
            <button onClick={() => { setSelected(null); setResults([]); }} className="text-gray-400 hover:text-gray-600 text-sm">✕ Deselect</button>
          </div>

          <div>
            <label className="label">Update Booking Status</label>
            <p className="text-xs text-gray-400 mb-3">This will be reflected on the PDF — the voucher will show the selected action prominently.</p>
            <div className="grid grid-cols-3 gap-3">
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setNewStatus(opt.value as any)}
                  className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 ${
                    newStatus === opt.value
                      ? `${opt.color} text-white border-transparent shadow-md`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {opt.badge && <span className="block text-xs mb-0.5 opacity-75">[{opt.badge}]</span>}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              newStatus === 'cancel' ? 'bg-red-50 text-red-700 border border-red-200'
            : newStatus === 'amend'  ? 'bg-orange-50 text-orange-700 border border-orange-200'
            :                          'bg-green-50 text-green-700 border border-green-200'
            }`}>
              The PDF will show: <strong>
                {STATUS_OPTS.find(o => o.value === newStatus)?.label}
              </strong>
              {newStatus !== 'book' && <> with a <strong>{newStatus === 'cancel' ? 'CANCELLED' : 'AMENDED'}</strong> badge</>}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={applyStatus} disabled={saving} className={`btn-primary ${
              newStatus === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
              newStatus === 'amend'  ? 'bg-orange-500 hover:bg-orange-600' : ''
            }`}>
              {saving ? 'Updating…' : `Update Voucher ${selected.voucherNo}`}
            </button>
            <Link href={`/dashboard/vouchers/${selected.id}`} className="btn-secondary">View Voucher</Link>
          </div>
        </div>
      )}

      {done && (
        <div className="card bg-green-50 border-green-200 text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-green-700 font-semibold">Voucher updated successfully!</p>
          <p className="text-green-600 text-sm">Redirecting to voucher…</p>
        </div>
      )}
    </div>
  );
}
