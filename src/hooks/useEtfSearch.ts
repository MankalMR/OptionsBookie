'use client';

import { useState, useCallback } from 'react';
import type { EtfSearchResult } from '@/types/etf';

export function useEtfSearch() {
  const [results, setResults] = useState<EtfSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/etfs/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to search ETFs');
      }

      const data: EtfSearchResult[] = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search ETFs');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clearResults };
}
