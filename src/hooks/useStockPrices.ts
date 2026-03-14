import { useState, useEffect, useCallback } from 'react';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface UseStockPricesReturn {
  stockPrices: Record<string, StockPrice | null>;
  loading: boolean;
  error: string | null;
  isAvailable: boolean;
  fetchPrices: (symbols: string[]) => Promise<void>;
  refreshPrices: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useStockPrices(symbols: string[]): UseStockPricesReturn {
  const [stockPrices, setStockPrices] = useState<Record<string, StockPrice | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchPrices = useCallback(async (symbolsToFetch: string[]) => {
    if (symbolsToFetch.length === 0 || isFetching) return;

    setIsFetching(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock-prices?symbols=${symbolsToFetch.join(',')}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stock prices: ${response.status}`);
      }

      const data = await response.json();

      // Check if stock prices are available
      const status = data._status;
      if (status === 'unavailable') {
        setIsAvailable(false);
        setError('Stock prices are temporarily unavailable due to technical difficulties');
        // Don't retry if unavailable - this prevents infinite loops
        return;
      } else {
        setIsAvailable(true);
        setError(null);
        // Remove the _status property before setting prices
        const { _status, ...prices } = data;
        setStockPrices(prev => ({ ...prev, ...prices }));
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching stock prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stock prices');
      // Don't retry on error - this prevents infinite loops
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [isFetching]);

  const refreshPrices = useCallback(async () => {
    if (symbols.length > 0) {
      await fetchPrices(symbols);
    }
  }, [symbols.join(',')]); // Only depend on symbols, not fetchPrices function

  // Fetch prices when symbols change
  useEffect(() => {
    if (symbols.length > 0) {
      fetchPrices(symbols);
    }
  }, [symbols.join(',')]); // Only depend on the actual symbols, not the fetchPrices function

  // Auto-refresh removed - we rely on 1-day cache for data freshness
  // Manual refresh is still available via refreshPrices() function

  return {
    stockPrices,
    loading,
    error,
    isAvailable,
    fetchPrices,
    refreshPrices,
    lastUpdated
  };
}

// Hook for single stock price
export function useStockPrice(symbol: string) {
  const { stockPrices, loading, error, isAvailable, fetchPrices, refreshPrices, lastUpdated } = useStockPrices([symbol]);

  return {
    stockPrice: stockPrices[symbol] || null,
    loading,
    error,
    isAvailable,
    refresh: () => refreshPrices(),
    lastUpdated
  };
}
