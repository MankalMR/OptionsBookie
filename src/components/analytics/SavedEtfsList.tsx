'use client';

import { Info } from 'lucide-react';
import type { SavedEtf } from '@/types/etf';
import EtfTerminalCard from './EtfTerminalCard';

interface SavedEtfsListProps {
  savedEtfs: SavedEtf[];
  loading: boolean;
  onSelect: (ticker: string) => void;
  onUnsave: (ticker: string) => void;
}


export default function SavedEtfsList({ savedEtfs, loading, onSelect, onUnsave }: SavedEtfsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (savedEtfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
        <Info className="h-8 w-8 mb-3 opacity-50" />
        <p className="text-sm font-medium">No saved ETFs yet</p>
        <p className="text-xs mt-1 text-center max-w-xs">Search for an ETF and click the star icon to add it to your watchlist.</p>
      </div>
    );
  }

  return (
    <>
      {savedEtfs.map((etf) => (
        <EtfTerminalCard
          key={etf.ticker}
          data={etf}
          onToggleSave={() => onUnsave(etf.ticker)}
          isSaved={true}
        />
      ))}
    </>
  );
}
