'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SavedEtf } from '@/types/etf';

export function useSavedEtfs() {
  const [savedEtfs, setSavedEtfs] = useState<SavedEtf[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedEtfs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/etfs/saved');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch saved ETFs');
      }

      const data: SavedEtf[] = await response.json();
      setSavedEtfs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saved ETFs');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveEtf = useCallback(async (ticker: string) => {
    try {
      const response = await fetch('/api/etfs/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save ETF');
      }

      await fetchSavedEtfs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ETF');
    }
  }, [fetchSavedEtfs]);

  const unsaveEtf = useCallback(async (ticker: string) => {
    try {
      const response = await fetch(`/api/etfs/saved/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unsave ETF');
      }

      await fetchSavedEtfs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsave ETF');
    }
  }, [fetchSavedEtfs]);

  useEffect(() => {
    fetchSavedEtfs();
  }, [fetchSavedEtfs]);

  return { savedEtfs, loading, error, saveEtf, unsaveEtf, fetchSavedEtfs };
}
