'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface DayRowRaw {
  destinationId?: number | null;
  destinationName?: string | null;
  hotelId?: number | null;
  hotelName?: string;
  adultAccomTotal?: number;
  childAccomTotal?: number;
  singleRoomRate?: number;
  parkFeeAdultTotal?: number;
  parkFeeChildTotal?: number;
  transportTotal?: number;
  hasFlight?: boolean;
  flightAdultPP?: number;
  flightChildPP?: number;
}

interface ExtraItemRaw {
  label: string;
  cost: number;
}

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
  dayRows?: DayRowRaw[] | string | null;
  extras?: ExtraItemRaw[] | string | null;
  fileHandlingFee?: number;
  ecoBottle?: number;
  evacInsurance?: number;
  arrivalTransfer?: number;
  departureTransfer?: number;
  maasaiVillage?: boolean;
  maasaiCost?: number;
}

function parseDayRows(raw: unknown): DayRowRaw[] {
  if (!raw) return [];
  let parsed: any = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function parseExtras(raw: unknown): ExtraItemRaw[] {
  if (!raw) return [];
  let parsed: any = raw;
  while (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return Object.values(parsed);
  return [];
}

function fmt2(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Recalculate perAdult and grandTotal using the same formula as the view page
  const computed = useMemo(() => {
    return sheets.map(s => {
      const numAdults = Number(s.numAdults) || 0;
      const numChildren = Number(s.numChildren) || 0;
      const numPax = numAdults + numChildren;
      const markupPercent = Number(s.markupPercent) || 10;

      const dayRows = parseDayRows(s.dayRows);
      const extras = parseExtras(s.extras);

      let accomPerPersonSum = 0;
      let parkGroupTotal = 0;
      let transportGroupTotal = 0;
      let flightGroupTotal = 0;
      dayRows.forEach(row => {
        const adultPP = Number(row.adultAccomTotal) || 0;
        const childPP = Number(row.childAccomTotal) || 0;
        const singleRate = Number(row.singleRoomRate) || 0;
        let accomGroup = 0;
        if (numAdults === 1 && singleRate > 0) {
          accomGroup = singleRate;
        } else if (numAdults > 1 && singleRate > 0) {
          accomGroup = adultPP * (numAdults - 1) + singleRate;
        } else {
          accomGroup = adultPP * numAdults + childPP * numChildren;
        }
        if (numPax > 0) accomPerPersonSum += accomGroup / numPax;
        parkGroupTotal += (Number(row.parkFeeAdultTotal) || 0) + (Number(row.parkFeeChildTotal) || 0);
        transportGroupTotal += Number(row.transportTotal) || 0;
        if (row.hasFlight) {
          flightGroupTotal += (Number(row.flightAdultPP) || 0) * numAdults + (Number(row.flightChildPP) || 0) * numChildren;
        }
      });

      let extrasTotal = (Number(s.fileHandlingFee) || 0) +
        (Number(s.ecoBottle) || 0) +
        (Number(s.evacInsurance) || 0) +
        (Number(s.arrivalTransfer) || 0) +
        (Number(s.departureTransfer) || 0) +
        (s.maasaiVillage ? (Number(s.maasaiCost) || 0) : 0);
      extras.forEach(e => extrasTotal += Number(e.cost) || 0);

      const transportPerPax = numPax > 0 ? transportGroupTotal / numPax : 0;
      const perAdult = accomPerPersonSum + parkGroupTotal + transportPerPax + extrasTotal + flightGroupTotal;
      const grandTotal = perAdult * (1 + markupPercent / 100);

      return { id: s.id, perAdult, grandTotal };
    });
  }, [sheets]);

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
            {filtered.map(s => {
              const c = computed.find(x => x.id === s.id);
              const grandTotal = c ? c.grandTotal : 0;
              const perAdult = c ? c.perAdult : 0;
              return (
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
                  {s.currency} {fmt2(grandTotal)}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-orange-600">
                  {s.currency} {fmt2(perAdult)}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
