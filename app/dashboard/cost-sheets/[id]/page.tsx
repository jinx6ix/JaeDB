'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CostSheetDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/cost-sheets/${id}`)
      .then(r => r.json())
      .then(data => { setSheet(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this costing sheet? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/cost-sheets/${id}`, { method: 'DELETE' });
    router.push('/dashboard/cost-sheets');
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!sheet) return <div className="p-8 text-gray-500">Costing sheet not found. <Link href="/dashboard/cost-sheets" className="text-orange-500 hover:underline">Back to list</Link></div>;

  const dayRows: any[] = (() => { try { return JSON.parse(sheet.dayRows || '[]'); } catch { return []; } })();
  const extras: any[] = (() => { try { return JSON.parse(sheet.extras || '[]'); } catch { return []; } })();
  const mf = 1 + sheet.markupPercent / 100;
  const fmt2 = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cost-sheets" className="text-gray-400 hover:text-gray-600 text-sm">← Costing Sheets</Link>
          <h1 className="text-2xl font-bold text-gray-900 max-w-lg truncate">{sheet.tourTitle}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/rates" className="btn-secondary text-sm">+ New Costing</Link>
          <button onClick={handleDelete} disabled={deleting}
            className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
            {deleting ? 'Deleting…' : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Client', value: sheet.client?.name || '—', href: sheet.client ? `/dashboard/clients/${sheet.client.id}` : undefined },
          { label: 'Booking', value: sheet.booking?.bookingRef || '—', href: sheet.booking ? `/dashboard/bookings/${sheet.booking.id}` : undefined },
          { label: 'Agent', value: sheet.agent ? `${sheet.agent.name}${sheet.agent.company ? ` (${sheet.agent.company})` : ''}` : '—' },
          { label: 'Created', value: new Date(sheet.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) },
        ].map(({ label, value, href }) => (
          <div key={label} className="card py-3">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            {href ? <Link href={href} className="text-orange-500 hover:underline font-medium text-sm">{value}</Link>
              : <p className="font-medium text-gray-800 text-sm">{value}</p>}
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Tour Length', value: `${sheet.days}D` },
          { label: 'Adults', value: String(sheet.numAdults) },
          { label: 'Children', value: String(sheet.numChildren) },
          { label: 'Board Basis', value: sheet.boardBasis },
          { label: 'Markup', value: `${sheet.markupPercent}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-bold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Day-by-day breakdown */}
      {dayRows.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="font-semibold text-gray-800">Day by Day</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Day', 'Hotel / Accom', 'Accom Adults', 'Accom Children', 'Park Adults', 'Park Children', 'Transport', 'Flight', 'Day Total'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dayRows.map((row: any, i: number) => {
                  const flightA = row.hasFlight ? (row.flightAdultPP || 0) * sheet.numAdults * mf : 0;
                  const flightC = row.hasFlight ? (row.flightChildPP || 0) * sheet.numChildren * mf : 0;
                  const dayTotal = (row.adultAccomTotal || row.adultTotal || 0) * mf +
                    (row.childAccomTotal || row.childTotal || 0) * mf +
                    (row.parkFeeAdultTotal || 0) + (row.parkFeeChildTotal || 0) +
                    (row.transportTotal || 0) + flightA + flightC;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{i+1}</span></td>
                      <td className="px-3 py-2 font-medium text-gray-700">{row.hotelName || '—'}</td>
                      <td className="px-3 py-2 font-mono">{sheet.currency} {fmt2((row.adultAccomTotal || row.adultTotal || 0) * mf)}</td>
                      <td className="px-3 py-2 font-mono text-gray-400">{sheet.numChildren > 0 ? `${sheet.currency} ${fmt2((row.childAccomTotal || row.childTotal || 0) * mf)}` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-green-600">{sheet.currency} {fmt2(row.parkFeeAdultTotal || 0)}</td>
                      <td className="px-3 py-2 font-mono text-green-600">{sheet.numChildren > 0 ? `${sheet.currency} ${fmt2(row.parkFeeChildTotal || 0)}` : '—'}</td>
                      <td className="px-3 py-2 font-mono text-green-600">{sheet.currency} {fmt2(row.transportTotal || 0)}</td>
                      <td className="px-3 py-2 font-mono text-purple-600">{row.hasFlight ? `${sheet.currency} ${fmt2(flightA + flightC)}` : '—'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{sheet.currency} {fmt2(dayTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card space-y-2">
          <h2 className="font-semibold text-gray-800 mb-3">Cost Summary</h2>
          {[
            { label: 'Subtotal (excl. markup)', value: sheet.subtotal, highlight: false },
            { label: `Markup (${sheet.markupPercent}%)`, value: sheet.markupAmount, highlight: false, orange: true },
            { label: 'Grand Total', value: sheet.totalCost, highlight: true },
          ].map(({ label, value, highlight, orange }) => (
            <div key={label} className={`flex justify-between py-1 ${highlight ? 'border-t-2 border-gray-200 mt-2 pt-3' : ''}`}>
              <span className={`text-sm ${highlight ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
              <span className={`font-mono text-sm font-semibold ${highlight ? 'text-green-700 text-lg' : orange ? 'text-orange-500' : 'text-gray-700'}`}>
                {sheet.currency} {fmt2(value)}
              </span>
            </div>
          ))}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 mb-1">Per Person</h2>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600">Per Adult</p>
              <p className="text-2xl font-bold text-orange-600">{sheet.currency} {fmt2(sheet.perAdultCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{sheet.numAdults} adult{sheet.numAdults !== 1 ? 's' : ''}</p>
              {sheet.numChildren > 0 && <p className="text-xs text-blue-500 mt-1">Child: {sheet.currency} {fmt2(sheet.perChildCost)}</p>}
            </div>
          </div>
          {/* Invoice creation shortcut */}
          {sheet.booking && (
            <Link href={`/dashboard/invoices/new?bookingId=${sheet.booking.id}&costSheetId=${sheet.id}`}
              className="block w-full text-center btn-primary text-sm py-2">
              🧾 Create Invoice from this Costing Sheet
            </Link>
          )}
          {!sheet.booking && (
            <p className="text-xs text-gray-400 text-center">Link to a booking to create an invoice</p>
          )}
        </div>
      </div>

      {/* Extras */}
      {(extras.length > 0 || sheet.maasaiVillage || sheet.fileHandlingFee > 0 || sheet.ecoBottle > 0 || sheet.evacInsurance > 0) && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">Extras & Fees</h2>
          <div className="space-y-2 text-sm">
            {sheet.fileHandlingFee > 0 && <div className="flex justify-between"><span className="text-gray-500">File Handling</span><span className="font-mono">{sheet.currency} {fmt2(sheet.fileHandlingFee * mf)}</span></div>}
            {sheet.ecoBottle > 0 && <div className="flex justify-between"><span className="text-gray-500">Eco Bottle + Water</span><span className="font-mono">{sheet.currency} {fmt2(sheet.ecoBottle * mf)}</span></div>}
            {sheet.evacInsurance > 0 && <div className="flex justify-between"><span className="text-gray-500">Evacuation Insurance</span><span className="font-mono">{sheet.currency} {fmt2(sheet.evacInsurance * mf)}</span></div>}
            {sheet.arrivalTransfer > 0 && <div className="flex justify-between"><span className="text-gray-500">Arrival Transfer</span><span className="font-mono">{sheet.currency} {fmt2(sheet.arrivalTransfer * mf)}</span></div>}
            {sheet.departureTransfer > 0 && <div className="flex justify-between"><span className="text-gray-500">Departure Transfer</span><span className="font-mono">{sheet.currency} {fmt2(sheet.departureTransfer * mf)}</span></div>}
            {sheet.maasaiVillage && sheet.maasaiCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Maasai Village</span><span className="font-mono">{sheet.currency} {fmt2(sheet.maasaiCost * mf)}</span></div>}
            {extras.map((e: any, i: number) => <div key={i} className="flex justify-between"><span className="text-gray-500">{e.label}</span><span className="font-mono">{sheet.currency} {fmt2(e.cost * mf)}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
