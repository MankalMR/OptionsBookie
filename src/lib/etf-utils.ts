import type { EtfHolding } from '@/types/etf';

/**
 * Calculates the total weight concentration of the top 10 holdings.
 * @param holdings Array of holdings with decimal weights (e.g. 0.085 for 8.5%)
 * @returns Total weight (0.0 to 1.0) or null if no holdings
 */
export function calculateTopTenConcentration(holdings: EtfHolding[] | null | undefined): number | null {
  if (!holdings || holdings.length === 0) return null;
  
  const topTenWeight = holdings
    .slice(0, 10)
    .reduce((sum, h) => sum + (h.weight || 0), 0);
    
  return topTenWeight > 0 ? topTenWeight : 0;
}

/**
 * Formats a number as a human-readable asset value (e.g. $1.2B, $400M)
 */
export function formatAum(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Formats a decimal value as a percentage string (e.g. 0.085 -> 8.50%)
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Ensures a financial metric (like yield or expense ratio) is never negative.
 * Returns null if input is null/undefined, otherwise returns Math.max(0, value).
 */
export function sanitizeMetric(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.max(0, value);
}
