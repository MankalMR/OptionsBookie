'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Heart, Info } from 'lucide-react';
import type { SavedEtf } from '@/types/etf';

interface SavedEtfsListProps {
  savedEtfs: SavedEtf[];
  loading: boolean;
  onSelect: (ticker: string) => void;
  onUnsave: (ticker: string) => void;
}

function formatAum(value: number | null): string {
  if (value === null) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${(value * 100).toFixed(2)}%`;
}

export default function SavedEtfsList({ savedEtfs, loading, onSelect, onUnsave }: SavedEtfsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (savedEtfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Info className="h-8 w-8 mb-2" />
        <p className="text-sm">No saved ETFs yet.</p>
        <p className="text-xs mt-1">Search for an ETF and click the heart icon to save it.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {savedEtfs.map((etf) => (
        <Card
          key={etf.ticker}
          className="cursor-pointer hover:border-blue-300 transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <button
                onClick={() => onSelect(etf.ticker)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-lg font-bold">{etf.ticker}</p>
                {etf.fundName && (
                  <p className="text-xs text-muted-foreground truncate">{etf.fundName}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>ER: {formatPercent(etf.netExpenseRatio)}</span>
                  <span>Yield: {formatPercent(etf.dividendYield)}</span>
                  <span>AUM: {formatAum(etf.netAssets)}</span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnsave(etf.ticker);
                }}
                className="shrink-0 p-1 hover:bg-muted rounded transition-colors"
              >
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
