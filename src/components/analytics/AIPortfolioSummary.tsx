'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface AIPortfolioSummaryProps {
  totalPnL: number;
  winRate: number;
  topSymbols: string[];
  totalRoC?: number;
  timeframe?: string;
  isDemo?: boolean;
}

export default function AIPortfolioSummary({
  totalPnL,
  winRate,
  topSymbols,
  totalRoC,
  timeframe = 'All Time',
  isDemo = false,
}: AIPortfolioSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/portfolio-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPnL,
          winRate,
          topSymbols,
          totalRoC,
          timeframe,
          isDemo,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setError('Could not generate summary at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only generate summary on mount if we have valid data
    if (totalPnL !== 0 || winRate !== 0) {
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPnL, winRate, topSymbols.join(','), timeframe]);

  if (error && !summary) {
    return null; // Gracefully hide on error if no summary exists
  }

  return (
    <div className={`bg-card rounded-lg shadow border p-6 ${isMobile ? 'mb-4' : 'mb-8'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-card-foreground">
          <Sparkles className="h-5 w-5 text-sky-500" />
          <h3 className="text-lg font-semibold">AI Portfolio Summary</h3>
        </div>
        <button
          onClick={generateSummary}
          disabled={isLoading}
          className="text-sm px-3 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      <div className="min-h-[60px] flex items-center">
        {isLoading && !summary ? (
          <div className="animate-pulse flex flex-col gap-2 w-full">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : summary ? (
          <p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>
        ) : (
          <p className="text-muted-foreground text-sm italic">Click regenerate to see AI summary.</p>
        )}
      </div>
    </div>
  );
}
