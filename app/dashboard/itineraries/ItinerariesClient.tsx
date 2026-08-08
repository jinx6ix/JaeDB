'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import DeleteItineraryButton from '@/components/DeleteItineraryButton';
import { Map, Globe, PlusCircle, Link2 } from 'lucide-react';

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
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Itineraries</h1>
          <p className="page-subtitle">
            {filtered.length} itinerar{filtered.length !== 1 ? 'ies' : 'y'}
            {query ? ` of ${itineraries.length}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/itineraries/from-source" className="btn-secondary">
            <Globe size={14} /> From Source
          </Link>
          <Link href="/dashboard/itineraries/new" className="btn-primary">
            <PlusCircle size={14} /> Generate Itinerary
          </Link>
        </div>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search title, booking ref, client, destination…"
        widthClass="w-full max-w-md"
      />

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="card text-center py-14">
            <Map size={36} className="text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium text-sm">
              {query ? `No itineraries match "${query}"` : 'No itineraries yet'}
            </p>
            {!query && (
              <p className="text-gray-400 text-xs mt-1">Create one from a booking or generate it with AI</p>
            )}
          </div>
        )}
        {filtered.map(it => (
          <div key={it.id} className="card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{it.title}</h3>
                  {it.booking ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 ring-1 ring-blue-200/60 px-2 py-0.5 rounded-full font-medium">
                      <Link2 size={10} /> Linked
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-50 text-gray-500 ring-1 ring-gray-200/60 px-2 py-0.5 rounded-full font-medium">
                      Standalone
                    </span>
                  )}
                  {it._count.embeds > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-600 ring-1 ring-violet-200/60 px-2 py-0.5 rounded-full font-medium">
                      <Link2 size={10} /> {it._count.embeds} embed{it._count.embeds !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {it.booking && (
                  <p className="text-sm text-gray-500 mt-1">
                    {it.booking.bookingRef} · {it.booking.client?.name}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {it._count.days} day{it._count.days !== 1 ? 's' : ''}
                  {it.days[0] && ` · Starts in ${it.days[0].destination}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/dashboard/itineraries/${it.id}`} className="btn-secondary text-xs py-1.5 px-3">
                  View
                </Link>
                <DeleteItineraryButton id={it.id} title={it.title} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
