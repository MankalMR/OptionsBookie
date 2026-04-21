'use client';

import { formatPercent } from '@/lib/etf-utils';
import type { EtfHolding } from '@/types/etf';

interface EtfHoldingsTableProps {
  holdings: EtfHolding[];
  limit?: number;
  showHeaders?: boolean;
}

export default function EtfHoldingsTable({ holdings, limit = 10, showHeaders = true }: EtfHoldingsTableProps) {
  const displayHoldings = holdings.slice(0, limit);
  // Do not show remaining text if not asked, or we can keep it for DetailView and omit for SavedView.
  // The snapshot doesn't show standard limits remaining text in standard tables, they just cut off.

  if (holdings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 font-mono">No holdings data available.</p>
    );
  }

  return (
    <div className="w-full text-[11px] leading-relaxed tracking-wide">
      {showHeaders && (
        <div className="flex border-b border-border/40 pb-2 mb-2 text-muted-foreground uppercase font-semibold">
          <div className="w-10">Rnk</div>
          <div className="w-16">Symbol</div>
          <div className="flex-1">Name</div>
          <div className="w-16 text-right">Weight</div>
        </div>
      )}
      <div className="space-y-1.5 font-mono">
        {displayHoldings.map((holding, index) => (
          <div key={`${holding.symbol}-${index}`} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-10 opacity-60">
              {`0${index + 1}`.slice(-2)}
            </div>
            <div className="w-16 font-medium text-foreground">
              {holding.symbol}
            </div>
            <div className="flex-1 truncate pr-2" title={holding.description}>
              {holding.description}
            </div>
            <div className="w-16 text-right font-medium">
              {formatPercent(holding.weight)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
