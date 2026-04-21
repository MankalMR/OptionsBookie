'use client';

import { useState, useCallback, useRef } from 'react';
import type { EtfSearchResult } from '@/types/etf';

export function useEtfSearch() {
  const [results, setResults] = useState<EtfSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, localOnly: boolean = false) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Abort previous request if it's still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const url = `/api/etfs/search?q=${encodeURIComponent(query)}${localOnly ? '&localOnly=true' : ''}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to search ETFs');
      }

      const data: EtfSearchResult[] = await response.json();
      
      // If we got results from a local search, update immediately.
      // If we got results from a full search, they might be more comprehensive.
      setResults(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to search ETFs');
      setResults([]);
    } finally {
      // Only clear loading if this was the most recent request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  const clearResults = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clearResults };
}
