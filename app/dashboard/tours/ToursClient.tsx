'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';

interface TourRow {
  id: string;
  title: string;
  durationDays: number;
  durationNights: number;
  countries: string;
  highlights: string | null;
  description: string | null;
  isActive: boolean;
  _count: { bookings: number; rateCards: number };
  days: { id: string; dayNumber: number; title: string }[];
}

const countryFlags: Record<string, string> = {
  KENYA: '🇰🇪', TANZANIA: '🇹🇿', UGANDA: '🇺🇬',
  RWANDA: '🇷🇼', ETHIOPIA: '🇪🇹', BURUNDI: '🇧🇮', SOUTH_SUDAN: '🇸🇸',
};

export default function ToursClient({ tours }: { tours: TourRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) => {
      let countries: string[] = [];
      try { countries = JSON.parse(t.countries || '[]') as string[]; } catch {}
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        countries.some((c) => c.toLowerCase().includes(q)) ||
        (t.highlights || '').toLowerCase().includes(q)
      );
    });
  }, [tours, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Packages</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {filtered.length} package{filtered.length !== 1 ? 's' : ''}
            {query ? ` (filtered from ${tours.length})` : ''}
          </p>
        </div>
        <Link href="/dashboard/tours/new" className="btn-primary">+ New Tour Package</Link>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by title, description, country, highlight…"
      />

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🦁</p>
            <p>{query ? `No tours match "${query}".` : 'No tour packages yet.'}</p>
          </div>
        )}
        {filtered.map(tour => {
          const countries: string[] = (() => {
            try { return JSON.parse(tour.countries || '[]') as string[]; } catch { return []; }
          })();
          const highlights: string[] = tour.highlights ? (() => {
            try { return JSON.parse(tour.highlights) as string[]; } catch { return []; }
          })() : [];

          return (
            <div key={tour.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{tour.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tour.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tour.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span>⏱ {tour.durationDays} day{tour.durationDays !== 1 ? 's' : ''} / {tour.durationNights} night{tour.durationNights !== 1 ? 's' : ''}</span>
                    <span>📋 {tour._count.bookings} booking{tour._count.bookings !== 1 ? 's' : ''}</span>
                    <span>💰 {tour._count.rateCards} rate card{tour._count.rateCards !== 1 ? 's' : ''}</span>
                    <span>{countries.map(c => countryFlags[c] || c).join(' ')}</span>
                  </div>
                  {tour.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tour.description}</p>
                  )}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {highlights.map((h, i) => (
                        <span key={i} className="bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full text-xs">{h}</span>
                      ))}
                    </div>
                  )}
                  {/* Day summary */}
                  {tour.days.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {tour.days.map(d => (
                        <div key={d.id} className="flex-shrink-0 text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[80px]">
                          <p className="text-xs font-bold text-orange-600">Day {d.dayNumber}</p>
                          <p className="text-xs text-gray-600 truncate max-w-[100px]">{d.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <Link href={`/dashboard/tours/${tour.id}`} className="btn-secondary text-sm">View</Link>
                  <Link href={`/dashboard/tours/${tour.id}/edit`} className="btn-secondary text-sm">Edit</Link>
                  <Link href={`/dashboard/costing/new?tourId=${tour.id}`} className="btn-secondary text-sm">+ Rate</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
