'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import DeleteItineraryButton from '@/components/DeleteItineraryButton';

interface ItineraryRow {
  id: string;
  title: string;
  booking: {
    bookingRef: string;
    client: { name: string } | null;
  } | null;
  days: { destination: string }[];
  _count: { days: number; embeds: number };
}

export default function ItinerariesClient({ itineraries }: { itineraries: ItineraryRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itineraries;
    return itineraries.filter((it) => {
      const starts = it.days[0]?.destination || '';
      return (
        it.title.toLowerCase().includes(q) ||
        (it.booking?.bookingRef || '').toLowerCase().includes(q) ||
        (it.booking?.client?.name || '').toLowerCase().includes(q) ||
        starts.toLowerCase().includes(q)
      );
    });
  }, [itineraries, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Itineraries</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} itinerar{filtered.length !== 1 ? 'ies' : 'y'}
            {query ? ` (filtered from ${itineraries.length})` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/itineraries/from-source" className="btn-secondary text-sm">🌐 From Source</Link>
          <Link href="/dashboard/itineraries/new" className="btn-primary text-sm">+ Generate Itinerary</Link>
        </div>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search title, booking ref, client name, destination…"
      />

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🗺️</p>
            <p>{query ? `No itineraries match "${query}".` : 'No itineraries yet. Create one from a booking.'}</p>
          </div>
        )}
        {filtered.map(it => (
          <div key={it.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{it.title}</h3>
                  {it.booking ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Linked</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Standalone</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {it.booking ? `${it.booking.bookingRef} · ${it.booking.client?.name}` : 'Not linked to a booking'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {it._count.days} day{it._count.days !== 1 ? 's' : ''}
                  {it.days[0] && ` · Starts: ${it.days[0].destination}`}
                  {it._count.embeds > 0 && <span className="ml-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">🔗 {it._count.embeds} embed</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/itineraries/${it.id}`} className="btn-secondary text-sm">View</Link>
                <DeleteItineraryButton id={it.id} title={it.title} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
