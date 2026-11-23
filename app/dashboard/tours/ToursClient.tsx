'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchInput from '@/components/SearchInput';
import { Compass, PlusCircle, Clock, BookOpen, Calculator } from 'lucide-react';

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
    <div className="space-y-5 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tour Packages</h1>
          <p className="page-subtitle">
            {filtered.length} package{filtered.length !== 1 ? 's' : ''}
            {query ? ` of ${tours.length}` : ''}
          </p>
        </div>
        <Link href="/dashboard/tours/new" className="btn-primary">
          <PlusCircle size={16} /> New Tour Package
        </Link>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by title, description, country, highlight…"
        widthClass="w-full max-w-md"
      />

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="card text-center py-14">
            <Compass size={36} className="text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium text-sm">
              {query ? `No tours match "${query}"` : 'No tour packages yet'}
            </p>
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
            <div key={tour.id} className="card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <h3 className="font-bold text-gray-900 text-base">{tour.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      tour.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tour.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {countries.length > 0 && (
                      <span className="text-lg leading-none">
                        {countries.map(c => countryFlags[c] || '').join(' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2.5 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      {tour.durationDays} day{tour.durationDays !== 1 ? 's' : ''} / {tour.durationNights} night{tour.durationNights !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={12} className="text-gray-400" />
                      {tour._count.bookings} booking{tour._count.bookings !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calculator size={12} className="text-gray-400" />
                      {tour._count.rateCards} rate card{tour._count.rateCards !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {tour.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{tour.description}</p>
                  )}

                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {highlights.map((h, i) => (
                        <span key={i} className="bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {tour.days.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {tour.days.map(d => (
                        <div key={d.id} className="flex-shrink-0 text-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 min-w-[88px]">
                          <p className="text-[11px] font-bold text-orange-600">Day {d.dayNumber}</p>
                          <p className="text-[11px] text-gray-500 truncate max-w-[100px] mt-0.5">{d.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-2 flex-shrink-0">
                  <Link href={`/dashboard/tours/${tour.id}`} className="btn-secondary text-xs py-1.5 px-3">View</Link>
                  <Link href={`/dashboard/tours/${tour.id}/edit`} className="btn-secondary text-xs py-1.5 px-3">Edit</Link>
                  <Link href={`/dashboard/costing/new?tourId=${tour.id}`} className="btn-secondary text-xs py-1.5 px-3 text-orange-600">+ Rate</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
