'use client';

import { useState, useEffect } from 'react';
import EtfCard from './EtfCard';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { SavedEtf } from '@/types/etf';

interface EtfsListProps {
  onRefresh?: () => void;
  refreshKey?: number;
}

export default function EtfsList({ onRefresh, refreshKey = 0 }: EtfsListProps) {
  const [etfs, setEtfs] = useState<SavedEtf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEtfs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/etfs/saved'); // This endpoint now returns the unified feed
      if (!response.ok) throw new Error('Failed to fetch ETF feed');
      const data = await response.json();
      setEtfs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEtfs();
  }, [refreshKey]);

  const handleToggleSave = async (ticker: string, isCurrentlySaved: boolean) => {
    try {
      const endpoint = isCurrentlySaved ? '/api/etfs/unsave' : '/api/etfs/save';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      if (response.ok) {
        // Optimistic update
        setEtfs(prev => prev.map(etf => 
          etf.ticker === ticker ? { ...etf, isSaved: !isCurrentlySaved } : etf
        ));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const handleRemove = async (ticker: string) => {
    try {
      const response = await fetch('/api/etfs/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      if (response.ok) {
        // Optimistic update
        setEtfs(prev => prev.filter(etf => etf.ticker !== ticker));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Error removing ETF from feed:', err);
    }
  };
   
  if (isLoading && etfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse uppercase tracking-widest font-mono">Loading Terminal Feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mt-4 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="font-bold">Error:</span> {error}
      </div>
    );
  }

  if (etfs.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-xl bg-card/30 backdrop-blur-sm mt-4">
        <h3 className="text-lg font-bold text-foreground">Terminal Empty</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
          Search for an ETF above to see it appear here in your intelligence feed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {etfs.map((etf) => (
        <EtfCard
          key={etf.ticker}
          data={etf}
          isSaved={etf.isSaved}
          onToggleSave={() => handleToggleSave(etf.ticker, etf.isSaved)}
          onRemove={() => handleRemove(etf.ticker)}
        />
      ))}
    </div>
  );
}
