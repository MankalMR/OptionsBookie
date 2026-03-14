import { OptionsTransaction } from '@/types/options';

/**
 * Utility functions for consistent formatting across the application
 */

/**
 * Get consistent row styling for transactions based on status
 */
export function getTransactionRowClass(status: string, isChain: boolean = false): string {
  const baseClasses = isChain
    ? "hover:bg-accent/50 border-l-4 border-l-blue-200 dark:border-l-blue-700"
    : "hover:bg-accent/50";

  // All Open transactions get the same background color
  if (status === 'Open') {
    return `${baseClasses} ${isChain
      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-blue-500'
      : 'bg-blue-50/80 dark:bg-blue-950/40'
    }`;
  }

  // All non-Open transactions (Rolled, Closed, Expired, Assigned) get the same background color
  if (['Rolled', 'Closed', 'Expired', 'Assigned'].includes(status)) {
    return `${baseClasses} ${isChain
      ? 'bg-gray-50 dark:bg-muted/60 border-l-muted-foreground'
      : 'bg-gray-50 dark:bg-muted/60'
    }`;
  }

  return baseClasses;
}

/**
 * Format strike price by removing trailing zeros
 */
export function formatStrikePrice(strikePrice: number): string {
  // Convert to fixed 2 decimal places first, then remove trailing zeros
  const formatted = strikePrice.toFixed(2);
  // Remove trailing zeros and decimal point if not needed
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Check if a transaction is a LEAP (expires more than 9 months out)
 */
export function isLEAP(transaction: OptionsTransaction): boolean {
  const expiryDate = new Date(transaction.expiryDate);
  const openDate = new Date(transaction.tradeOpenDate);
  const monthsDiff = (expiryDate.getFullYear() - openDate.getFullYear()) * 12 +
                    (expiryDate.getMonth() - openDate.getMonth());
  return monthsDiff > 9;
}
