import { useState, useEffect, useCallback } from 'react';
import { logger } from "@/lib/logger";

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  isStale?: boolean;
}

interface UseStockPricesReturn {
  stockPrices: Record<string, StockPrice | null>;
  loading: boolean;
  error: string | null;
  isAvailable: boolean;
  fetchPrices: (symbols: string[], activeSymbols?: string[]) => Promise<void>;
  refreshPrices: () => Promise<void>;
  lastUpdated: Date | null;
}

// Module-level global cache and synchronization system to deduplicate requests across all hook instances
const globalStockPricesCache: Record<string, StockPrice> = {};
const globalListeners = new Set<(prices: Record<string, StockPrice>) => void>();
const inFlightSymbols = new Set<string>();

export function useStockPrices(symbols: string[], activeSymbols: string[] = []): UseStockPricesReturn {
  // Sort symbols and activeSymbols to ensure stable string representation
  const sortedSymbols = [...symbols].sort();
  const sortedSymbolsStr = sortedSymbols.join(',');
  
  const sortedActiveSymbols = [...activeSymbols].sort();
  const activeSymbolsStr = sortedActiveSymbols.join(',');

  const [stockPrices, setStockPrices] = useState<Record<string, StockPrice | null>>(() => {
    const initial: Record<string, StockPrice | null> = {};
    symbols.forEach(sym => {
      initial[sym] = globalStockPricesCache[sym] || null;
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Subscribe to changes in the global stock prices cache
  useEffect(() => {
    const symbolsList = sortedSymbolsStr ? sortedSymbolsStr.split(',') : [];
    const handleUpdate = (updatedCache: Record<string, StockPrice>) => {
      setStockPrices(prev => {
        const next = { ...prev };
        let changed = false;
        symbolsList.forEach(sym => {
          if (updatedCache[sym] && updatedCache[sym] !== prev[sym]) {
            next[sym] = updatedCache[sym];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    globalListeners.add(handleUpdate);
    // Initialize/sync immediately with whatever is in the cache now
    handleUpdate(globalStockPricesCache);

    return () => {
      globalListeners.delete(handleUpdate);
    };
  }, [sortedSymbolsStr]);

  const fetchPrices = useCallback(async (symbolsToFetch: string[], activeToFetch?: string[]) => {
    if (symbolsToFetch.length === 0) return;

    // Filter out symbols that are already in-flight
    const symbolsNotFetching = symbolsToFetch.filter(sym => !inFlightSymbols.has(sym));
    
    // Check if any of the symbols actually need to be fetched (not in cache, or stale)
    const needsFetch = symbolsNotFetching.some(sym => {
      const cached = globalStockPricesCache[sym];
      if (!cached) return true;
      if (cached.isStale) return true;
      
      // Cache validity duration: 1 minute for client-side deduplication
      const ageMs = Date.now() - new Date(cached.timestamp).getTime();
      return ageMs > 60_000;
    });

    if (!needsFetch) {
      return;
    }

    // Mark as in-flight
    symbolsNotFetching.forEach(sym => inFlightSymbols.add(sym));
    setLoading(true);
    setError(null);

    try {
      const activeList = activeToFetch || (activeSymbolsStr ? activeSymbolsStr.split(',') : []);
      const activeParam = activeList.length > 0 ? `&activeSymbols=${activeList.join(',')}` : '';
      const response = await fetch(`/api/stock-prices?symbols=${symbolsNotFetching.join(',')}${activeParam}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stock prices: ${response.status}`);
      }

      const data = await response.json();
      const status = data._status;

      if (status === 'unavailable') {
        setIsAvailable(false);
        setError('Stock prices are temporarily unavailable due to technical difficulties');
        return;
      } else {
        setIsAvailable(true);
        setError(null);
        
        const { _status: _, ...prices } = data;
        const nowStr = new Date().toISOString();

        // Update global cache
        Object.entries(prices).forEach(([sym, priceData]) => {
          if (priceData) {
            const p = priceData as { symbol: string; price: number; change: number; changePercent: number; isStale?: boolean };
            globalStockPricesCache[sym] = {
              symbol: p.symbol,
              price: p.price,
              change: p.change,
              changePercent: p.changePercent,
              isStale: p.isStale,
              timestamp: nowStr
            };
          }
        });

        // Notify all subscribers
        globalListeners.forEach(listener => listener(globalStockPricesCache));
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.error({ err }, 'Error fetching stock prices:');
      setError(err instanceof Error ? err.message : 'Failed to fetch stock prices');
    } finally {
      // Remove from in-flight list
      symbolsNotFetching.forEach(sym => inFlightSymbols.delete(sym));
      setLoading(false);
    }
  }, [activeSymbolsStr]);

  const refreshPrices = useCallback(async () => {
    const symbolsList = sortedSymbolsStr ? sortedSymbolsStr.split(',') : [];
    if (symbolsList.length > 0) {
      // When explicitly refreshing, bypass freshness check and fetch everything
      // But we still respect inFlight symbols
      const symbolsToFetch = symbolsList.filter(sym => !inFlightSymbols.has(sym));
      if (symbolsToFetch.length > 0) {
        symbolsToFetch.forEach(sym => inFlightSymbols.add(sym));
        setLoading(true);
        setError(null);
        try {
          const activeParam = activeSymbolsStr ? `&activeSymbols=${activeSymbolsStr}` : '';
          const response = await fetch(`/api/stock-prices?symbols=${symbolsToFetch.join(',')}${activeParam}`);
          if (!response.ok) throw new Error(`Failed to fetch stock prices: ${response.status}`);
          const data = await response.json();
          if (data._status !== 'unavailable') {
            const { _status: _, ...prices } = data;
            const nowStr = new Date().toISOString();
            Object.entries(prices).forEach(([sym, priceData]) => {
              if (priceData) {
                const p = priceData as { symbol: string; price: number; change: number; changePercent: number; isStale?: boolean };
                globalStockPricesCache[sym] = {
                  symbol: p.symbol,
                  price: p.price,
                  change: p.change,
                  changePercent: p.changePercent,
                  isStale: p.isStale,
                  timestamp: nowStr
                };
              }
            });
            globalListeners.forEach(listener => listener(globalStockPricesCache));
            setLastUpdated(new Date());
          }
        } catch (err) {
          logger.error({ err }, 'Error refreshing stock prices:');
          setError(err instanceof Error ? err.message : 'Failed to fetch stock prices');
        } finally {
          symbolsToFetch.forEach(sym => inFlightSymbols.delete(sym));
          setLoading(false);
        }
      }
    }
  }, [sortedSymbolsStr, activeSymbolsStr]);

  // Fetch prices when symbols or activeSymbols change
  useEffect(() => {
    const symbolsList = sortedSymbolsStr ? sortedSymbolsStr.split(',') : [];
    if (symbolsList.length > 0) {
      const activeList = activeSymbolsStr ? activeSymbolsStr.split(',') : [];
      fetchPrices(symbolsList, activeList);
    }
  }, [sortedSymbolsStr, activeSymbolsStr, fetchPrices]);

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
  const { stockPrices, loading, error, isAvailable, refreshPrices, lastUpdated } = useStockPrices([symbol]);

  return {
    stockPrice: stockPrices[symbol] || null,
    loading,
    error,
    isAvailable,
    refresh: () => refreshPrices(),
    lastUpdated
  };
}

