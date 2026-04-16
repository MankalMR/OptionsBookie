// Stock price service with shared caching (works with Alpha Vantage data)
import { sharedStockPriceCache } from './stock-price-cache';
import { alphaVantageStockService } from './stock-price-alphavantage';
import { finnhubStockService } from './stock-price-finnhub';
import { logger } from "@/lib/logger";

interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  isStale?: boolean;
}

// Removed unused interface since we're not fetching from external APIs

export class CachedStockService {
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day in milliseconds

  /**
   * Get cached price data from shared cache
   */
  private async getCachedPrice(symbol: string): Promise<StockPriceResponse | null> {
    return await sharedStockPriceCache.getCachedPrice(symbol);
  }

  /**
   * Cache price data to shared cache
   */
  private async cachePrice(symbol: string, data: StockPriceResponse): Promise<void> {
    await sharedStockPriceCache.cachePrice(symbol, data);
  }

  /**
   * Fetch current stock price for a given symbol
   */
  async getStockPrice(symbol: string, activeSymbols: string[] = []): Promise<StockPriceResponse | null> {
    if (!symbol) return null;

    const normalizedSymbol = symbol.toUpperCase();
    const isActive = activeSymbols.length === 0 || activeSymbols.includes(normalizedSymbol);

    try {
      // Check shared cache first
      logger.info(`Checking cache for ${normalizedSymbol}`);
      const cached = await this.getCachedPrice(normalizedSymbol);
      
      // If we have a fresh cache, or if it's inactive and we have any cache, return it
      if (cached && (!cached.isStale || !isActive)) {
        logger.info(`✅ Using cached price for ${normalizedSymbol}: $${cached.price} (Stale: ${!!cached.isStale})`);
        return cached;
      }

      // If not cached (or stale but active) and Alpha Vantage is available, try to fetch from Alpha Vantage
      if (isActive) {
        // 1. Try Alpha Vantage
        if (process.env.ALPHA_VANTAGE_KEY) {
          logger.info(`Fetching fresh price for ${normalizedSymbol} from Alpha Vantage`);
          try {
            const priceData = await alphaVantageStockService.getStockPrice(normalizedSymbol);
            if (priceData) {
              logger.info(`💾 Caching Alpha Vantage price for ${normalizedSymbol}`);
              await this.cachePrice(normalizedSymbol, priceData);
              return priceData;
            }
          } catch (error) {
            logger.info({ error }, `Alpha Vantage failed for ${normalizedSymbol}`);
          }
        }

        // 2. Fallback to Finnhub if Alpha Vantage failed or wasn't tried
        if (process.env.FINNHUB_API_KEY) {
          logger.info(`🔄 Trying Finnhub fallback for ${normalizedSymbol}`);
          try {
            const finnhubData = await finnhubStockService.getStockPrice(normalizedSymbol);
            if (finnhubData) {
              logger.info(`💾 Caching Finnhub price for ${normalizedSymbol}`);
              await this.cachePrice(normalizedSymbol, finnhubData);
              return finnhubData;
            }
          } catch (error) {
            logger.info({ error }, `Finnhub fallback failed for ${normalizedSymbol}`);
          }
        }

        // 3. Last Resort: Use stale cache if available (Zero-Null Policy)
        if (cached) {
          logger.info(`⚠️ All providers failed. Using stale cache for ${normalizedSymbol} - Zero-Null Policy`);
          return cached;
        }
      } else {
        logger.info(`Not an active symbol, skipped live fetch for ${normalizedSymbol}`);
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Error fetching stock price:');
      return null;
    }
  }

  /**
   * Fetch multiple stock prices in batch
   */
  async getMultipleStockPrices(symbols: string[], activeSymbols: string[] = []): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    // Check shared cache for all symbols first
    const cachedResults = await sharedStockPriceCache.getMultipleCachedPrices(symbols);
    const symbolsToFetch: string[] = [];
    const activeSymbolsUpper = activeSymbols.map(s => s.toUpperCase());

    logger.info(`📦 Checking cache for ${symbols.length} symbols: ${symbols.join(', ')}`);

    symbols.forEach(symbol => {
      const normalizedSymbol = symbol.toUpperCase();
      const isActive = activeSymbolsUpper.length === 0 || activeSymbolsUpper.includes(normalizedSymbol);
      const cached = cachedResults[symbol];

      if (cached && (!cached.isStale || !isActive)) {
        logger.info(`✅ Using cached price for ${symbol}: $${cached.price} (Stale: ${!!cached.isStale})`);
        results[symbol] = cached;
      } else if (isActive) {
        logger.info(`❌ No fresh/valid cached price for active symbol ${symbol}`);
        symbolsToFetch.push(symbol);
      } else {
        // Not active, but no cache either
        logger.info(`⚪ Not an active symbol and no cache for ${symbol}, returning null`);
        results[symbol] = cached || null;
      }
    });

    if (symbolsToFetch.length > 0) {
      logger.info(`🔄 Need to fetch ${symbolsToFetch.length} symbols from Alpha Vantage: ${symbolsToFetch.join(', ')}`);
    }

    // Fetch uncached symbols from providers
    if (symbolsToFetch.length > 0) {
      let currentUncached = [...symbolsToFetch];

      // 1. Try Alpha Vantage
      if (process.env.ALPHA_VANTAGE_KEY) {
        logger.info(`Fetching fresh prices for: ${currentUncached.join(', ')} from Alpha Vantage`);
        try {
          const alphaVantageResults = await alphaVantageStockService.getMultipleStockPrices(currentUncached);
          
          const pricesToCache: Record<string, StockPriceResponse | null> = {};
          currentUncached.forEach(symbol => {
            if (alphaVantageResults[symbol]) {
              results[symbol] = alphaVantageResults[symbol];
              pricesToCache[symbol] = alphaVantageResults[symbol];
            }
          });

          if (Object.keys(pricesToCache).length > 0) {
            await sharedStockPriceCache.cacheMultiplePrices(Object.keys(pricesToCache), pricesToCache);
          }

          // Update symbols left to fetch
          currentUncached = currentUncached.filter(s => !results[s]);
        } catch (error) {
          logger.info({ error }, `Alpha Vantage batch failed for: ${currentUncached.join(', ')}`);
        }
      }

      // 2. Fallback to Finnhub for remaining symbols
      if (currentUncached.length > 0 && process.env.FINNHUB_API_KEY) {
        logger.info(`🔄 Trying Finnhub fallback for: ${currentUncached.join(', ')}`);
        try {
          const finnhubResults = await finnhubStockService.getMultipleStockPrices(currentUncached);
          
          const pricesToCache: Record<string, StockPriceResponse | null> = {};
          currentUncached.forEach(symbol => {
            if (finnhubResults[symbol]) {
              results[symbol] = finnhubResults[symbol];
              pricesToCache[symbol] = finnhubResults[symbol];
            }
          });

          if (Object.keys(pricesToCache).length > 0) {
            await sharedStockPriceCache.cacheMultiplePrices(Object.keys(pricesToCache), pricesToCache);
          }

          // Update symbols left to fetch
          currentUncached = currentUncached.filter(s => !results[s]);
        } catch (error) {
          logger.info({ error }, `Finnhub batch fallback failed for: ${currentUncached.join(', ')}`);
        }
      }

      // 3. Zero-Null Policy: Fallback to stale cache for any still-missing symbols
      if (currentUncached.length > 0) {
        logger.info(`⚠️ Live fetch failed for: ${currentUncached.join(', ')}. Checking for stale cache fallback.`);
        currentUncached.forEach(symbol => {
          if (cachedResults[symbol]) {
            logger.info(`✅ Using stale cache recovery for ${symbol} - Zero-Null Policy`);
            results[symbol] = cachedResults[symbol];
          } else {
            results[symbol] = null;
          }
        });
      }
    }

    return results;
  }

  /**
   * Get price comparison for options analysis
   */
  getPriceComparison(currentPrice: number, strikePrice: number) {
    const difference = currentPrice - strikePrice;
    const percentDifference = (difference / strikePrice) * 100;

    return {
      difference,
      percentDifference,
      isInTheMoney: difference > 0,
      isOutOfTheMoney: difference < 0,
      isAtTheMoney: Math.abs(difference) < (strikePrice * 0.01) // Within 1%
    };
  }
}

// Singleton instance
export const cachedStockService = new CachedStockService();
