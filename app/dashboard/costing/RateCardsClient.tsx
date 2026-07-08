'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface RateCardRow {
  id: string;
  season: string;
  validFrom: string;
  validTo: string;
  basedOn2: number;
  basedOn4: number;
  basedOn6: number;
  basedOn8: number;
  markupPercent: number;
  currency: string;
  tourPackage: { id: string; title: string };
}

export default function RateCardsClient({ rateCards }: { rateCards: RateCardRow[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rateCards;
    return rateCards.filter(rc =>
      rc.tourPackage.title.toLowerCase().includes(needle) ||
      rc.season.toLowerCase().includes(needle) ||
      rc.currency.toLowerCase().includes(needle)
    );
  }, [rateCards, q]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-gray-800">Rate Cards</h2>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by tour, season, currency…"
          widthClass="w-72"
        />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Tour', 'Season', 'Valid Period', '2 Pax', '4 Pax', '6 Pax', '8 Pax', 'Markup', 'Currency', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.length === 0 && (
            <tr><td colSpan={10} className="text-center text-gray-400 py-8">{q ? `No rate cards match "${q}".` : 'No rate cards yet'}</td></tr>
          )}
          {filtered.map(rc => (
            <tr key={rc.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-800 max-w-xs">
                <p className="font-medium truncate">{rc.tourPackage.title}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  rc.season === 'HIGH' ? 'bg-red-100 text-red-700' :
                  rc.season === 'LOW' ? 'bg-green-100 text-green-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{rc.season}</span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                {new Date(rc.validFrom).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })} –{' '}
                {new Date(rc.validTo).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              {[rc.basedOn2, rc.basedOn4, rc.basedOn6, rc.basedOn8].map((v, i) => (
                <td key={i} className="px-4 py-3 text-gray-700 font-mono">{(v as number).toLocaleString()}</td>
              ))}
              <td className="px-4 py-3 text-gray-600">{rc.markupPercent}%</td>
              <td className="px-4 py-3 text-gray-600">{rc.currency}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link href={`/dashboard/costing/${rc.id}/edit`} className="text-orange-500 hover:underline text-xs">Edit</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
