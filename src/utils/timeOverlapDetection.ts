/**
 * Time Overlap Detection Utility
 *
 * Detects if trades on the same stock overlap in time to determine
 * if capital needs to be counted multiple times (concurrent positions)
 * or just once (sequential reuse of same capital).
 */

import { OptionsTransaction } from '@/types/options';
import { parseLocalDate } from './dateUtils';

export interface OverlapDetectionResult {
  hasOverlap: boolean;
  overlappingGroups: OptionsTransaction[][];
  sequentialTrades: OptionsTransaction[];
}

/**
 * Checks if two date ranges overlap
 * Returns true if there's any overlap between the two periods
 *
 * Note: Same-day close and open is considered sequential, not overlapping
 * Trade A ending on day X and Trade B starting on day X = NOT overlapping
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Check if ranges don't overlap, then negate
  // No overlap if: end1 <= start2 OR end2 <= start1
  // (Using <= means same-day close/open is treated as sequential, not overlapping)

  return !(end1 <= start2 || end2 <= start1);
}

/**
 * Detects time overlaps for a group of transactions
 *
 * Algorithm:
 * 1. Sort trades by open date
 * 2. Track which trades are currently "active" (open but not yet closed)
 * 3. When a new trade opens, check if any active trades overlap with it
 * 4. Group overlapping trades together
 * 5. Sequential trades (no overlap) are kept separate
 *
 * Complexity: O(n²) worst case, O(n) best case
 * where n = number of transactions
 */
export function detectTimeOverlaps(
  transactions: OptionsTransaction[]
): OverlapDetectionResult {
  if (transactions.length === 0) {
    return {
      hasOverlap: false,
      overlappingGroups: [],
      sequentialTrades: []
    };
  }

  if (transactions.length === 1) {
    return {
      hasOverlap: false,
      overlappingGroups: [],
      sequentialTrades: transactions
    };
  }

  // Filter out transactions without close dates
  const validTransactions = transactions.filter(t => t.tradeOpenDate && t.closeDate);

  if (validTransactions.length <= 1) {
    return {
      hasOverlap: false,
      overlappingGroups: [],
      sequentialTrades: validTransactions
    };
  }

  // Sort by open date
  const sorted = [...validTransactions].sort((a, b) => {
    const dateA = parseLocalDate(a.tradeOpenDate);
    const dateB = parseLocalDate(b.tradeOpenDate);
    return dateA.getTime() - dateB.getTime();
  });

  const overlappingGroups: OptionsTransaction[][] = [];
  const sequentialTrades: OptionsTransaction[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    if (processed.has(sorted[i].id)) continue;

    const currentTrade = sorted[i];
    const currentStart = parseLocalDate(currentTrade.tradeOpenDate);
    const currentEnd = parseLocalDate(currentTrade.closeDate!);

    // Find all trades that overlap with this one
    const overlappingTrades = [currentTrade];
    processed.add(currentTrade.id);

    for (let j = i + 1; j < sorted.length; j++) {
      if (processed.has(sorted[j].id)) continue;

      const otherTrade = sorted[j];
      const otherStart = parseLocalDate(otherTrade.tradeOpenDate);
      const otherEnd = parseLocalDate(otherTrade.closeDate!);

      if (dateRangesOverlap(currentStart, currentEnd, otherStart, otherEnd)) {
        overlappingTrades.push(otherTrade);
        processed.add(otherTrade.id);
      }
    }

    // If only one trade in the group, it's sequential
    if (overlappingTrades.length === 1) {
      sequentialTrades.push(currentTrade);
    } else {
      overlappingGroups.push(overlappingTrades);
    }
  }

  return {
    hasOverlap: overlappingGroups.length > 0,
    overlappingGroups,
    sequentialTrades
  };
}

/**
 * Detects overlaps for transactions grouped by stock symbol
 * Returns a map of stock symbol to overlap detection results
 */
export function detectOverlapsByStock(
  transactions: OptionsTransaction[]
): Map<string, OverlapDetectionResult> {
  const byStock = new Map<string, OptionsTransaction[]>();

  // Group by stock
  transactions.forEach(t => {
    if (!byStock.has(t.stockSymbol)) {
      byStock.set(t.stockSymbol, []);
    }
    byStock.get(t.stockSymbol)!.push(t);
  });

  // Detect overlaps for each stock
  const results = new Map<string, OverlapDetectionResult>();
  for (const [stock, stockTrades] of byStock.entries()) {
    results.set(stock, detectTimeOverlaps(stockTrades));
  }

  return results;
}

