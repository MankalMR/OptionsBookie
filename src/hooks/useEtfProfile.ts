'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EtfProfile } from '@/types/etf';

export function useEtfProfile(ticker: string | null) {
  const [profile, setProfile] = useState<EtfProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (t: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/etfs/${encodeURIComponent(t)}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch ETF profile');
      }

      const data: EtfProfile = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ETF profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ticker) {
      fetchProfile(ticker);
    } else {
      setProfile(null);
      setError(null);
    }
  }, [ticker, fetchProfile]);

  const refresh = useCallback(() => {
    if (ticker) fetchProfile(ticker);
  }, [ticker, fetchProfile]);

  return { profile, loading, error, refresh };
}
