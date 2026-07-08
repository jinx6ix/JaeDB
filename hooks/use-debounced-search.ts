'use client';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from './use-debounce';

export interface DebouncedSearchState<T> {
  results: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Debounced API search hook.
 * Calls `fetcher(q)` whenever the debounced query changes (delayMs after last keystroke).
 * Returns { results, loading, error, query, setQuery }.
 */
export function useDebouncedSearch<T>(
  fetcher: (q: string) => Promise<T[]>,
  { delayMs = 250, initial = [] as T[] } = {},
) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, delayMs);
  const [results, setResults] = useState<T[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    fetcher(debouncedQuery)
      .then((data) => {
        if (id !== reqId.current) return; // stale
        setResults(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e: any) => {
        if (id !== reqId.current) return;
        setError(e?.message || 'Search failed');
      })
      .finally(() => {
        if (id !== reqId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return { query, setQuery, debouncedQuery, results, loading, error };
}

export default useDebouncedSearch;
