'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CostSheet {
  id: string;
  tourTitle: string;
  numAdults: number;
  numChildren: number;
  currency: string;
  totalCost: number;
  perAdultCost: number;
  markupPercent: number;
  boardBasis: string;
  days: number;
  createdAt: string;
  client?: { id: string; name: string } | null;
  booking?: { id: string; bookingRef: string } | null;
  agent?: { id: string; name: string; company?: string | null } | null;
}

export default function CostSheetsPage() {
  const [sheets, setSheets] = useState<CostSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/cost-sheets');
    const data = await res.json();
    setSheets(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete costing sheet for "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/cost-sheets/${id}`, { method: 'DELETE' });
    setSheets(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  }

  const filtered = sheets.filter(s =>
    !q || s.tourTitle.toLowerCase().includes(q.toLowerCase()) ||
    s.client?.name.toLowerCase().includes(q.toLowerCase()) ||
    s.booking?.bookingRef.toLowerCase().includes(q.toLowerCase()) ||
    s.agent?.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Costing Sheets</h1>
          <p className="text-gray-500 text-sm mt-0.5">All saved cost calculations linked to clients & bookings</p>
        </div>
        <Link href="/dashboard/costing" className="btn-primary">+ New Costing Sheet</Link>
      </div>

      <div className="flex gap-3">
        <input value={q} onChange={e => setQ(e.target.value)} className="input max-w-xs" placeholder="Search by client, booking ref, tour…" />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Tour / Package', 'Client', 'Booking', 'Pax', 'Days', 'Board', 'Grand Total', 'Per Adult', 'Markup', 'Created', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">No costing sheets yet. <Link href="/dashboard/costing" className="text-orange-500 hover:underline">Create one →</Link></td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate text-xs">{s.tourTitle}</td>
                <td className="px-4 py-3 text-xs">
                  {s.client ? (
                    <Link href={`/dashboard/clients/${s.client.id}`} className="text-orange-500 hover:underline">{s.client.name}</Link>
                  ) : <span className="text-gray-400">—</span>}
                  {s.agent && <p className="text-gray-400 text-xs">{s.agent.name}</p>}
                </td>
                <td className="px-4 py-3 text-xs">
                  {s.booking ? (
                    <Link href={`/dashboard/bookings/${s.booking.id}`} className="text-orange-500 hover:underline font-mono">{s.booking.bookingRef}</Link>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {s.numAdults}A{s.numChildren > 0 ? ` + ${s.numChildren}C` : ''}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{s.days}D</td>
                <td className="px-4 py-3 text-xs">
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{s.boardBasis}</span>
                </td>
                <td className="px-4 py-3 text-xs font-mono font-bold text-gray-900">
                  {s.currency} {s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-orange-600">
                  {s.currency} {s.perAdultCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{s.markupPercent}%</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString('en-KE')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/dashboard/cost-sheets/${s.id}`} className="text-orange-500 hover:underline text-xs font-medium">View</Link>
                    <button onClick={() => handleDelete(s.id, s.tourTitle)} disabled={deleting === s.id} className="text-red-400 hover:text-red-600 text-xs">
                      {deleting === s.id ? '…' : 'Delete'}
                    </button>
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
