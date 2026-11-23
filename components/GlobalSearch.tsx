'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useDebouncedValue } from '@/hooks/use-debounce';

interface SearchHit {
  kind: string;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  badge?: string;
}

const KIND_ORDER: Record<string, number> = {
  Booking: 1,
  Client: 2,
  Voucher: 3,
  Invoice: 4,
  'Cost Sheet': 5,
  Itinerary: 6,
  Tour: 7,
  'Travel Agent': 8,
  Property: 9,
  Vehicle: 10,
  'Hotel Rate': 11,
  User: 12,
};

function groupHits(hits: SearchHit[]): Record<string, SearchHit[]> {
  const out: Record<string, SearchHit[]> = {};
  for (const h of hits) (out[h.kind] = out[h.kind] || []).push(h);
  return out;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const activeIdx = useRef(-1);
  const [activeTick, setActiveTick] = useState(0); // re-render on active row change

  // Fetch results when debounced query changes.
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchHit[]) => {
        if (id !== reqId.current) return;
        setResults(Array.isArray(data) ? data : []);
        activeIdx.current = -1;
        setActiveTick((t) => t + 1);
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setResults([]);
      })
      .finally(() => {
        if (id !== reqId.current) return;
        setLoading(false);
      });
  }, [debouncedQuery]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcuts: '/' focuses the input; Cmd/Ctrl+K focuses it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement?.tagName || ''))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grouped = useMemo(() => groupHits(results), [results]);
  const orderedKinds = Object.keys(grouped).sort(
    (a, b) => (KIND_ORDER[a] ?? 99) - (KIND_ORDER[b] ?? 99),
  );

  // Flatten for arrow navigation.
  const flat: SearchHit[] = results;
  function moveActive(delta: number) {
    if (flat.length === 0) return;
    activeIdx.current = (activeIdx.current + delta + flat.length) % flat.length;
    setActiveTick((t) => t + 1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter') {
      const hit = flat[activeIdx.current];
      if (hit) {
        e.preventDefault();
        window.location.href = hit.href;
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
          🔍
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search anything… (press /)"
          className="input pl-9 pr-9 text-sm w-full"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin block" />
          </span>
        )}
        {!loading && query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"
          >
            ×
          </button>
        )}
      </div>

      {open && debouncedQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto">
          {!loading && results.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No matches for <span className="font-medium">"{debouncedQuery}"</span>
            </div>
          )}
          {orderedKinds.map((kind) => (
            <div key={kind}>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                {kind} <span className="text-gray-300">· {grouped[kind].length}</span>
              </div>
              {grouped[kind].map((hit) => {
                const flatIdx = flat.indexOf(hit);
                const isActive = flatIdx === activeIdx.current;
                return (
                  <Link
                    key={`${hit.kind}-${hit.id}`}
                    href={hit.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery('');
                      setResults([]);
                    }}
                    onMouseEnter={() => {
                      activeIdx.current = flatIdx;
                      setActiveTick((t) => t + 1);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isActive ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{hit.label}</p>
                      {hit.sublabel && (
                        <p className="text-xs text-gray-500 truncate">{hit.sublabel}</p>
                      )}
                    </div>
                    {hit.badge && (
                      <span className="text-[10px] uppercase font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {hit.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          {/* activeTick referenced so re-render fires; suppress unused warning */}
          <input type="hidden" value={activeTick} readOnly />
        </div>
      )}
    </div>
  );
}
