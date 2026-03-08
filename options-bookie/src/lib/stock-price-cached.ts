// Stock price service with shared caching (works with Alpha Vantage data)
import { sharedStockPriceCache } from './stock-price-cache';
import { alphaVantageStockService } from './stock-price-alphavantage';
import { debugLog } from '../utils/logger';

interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
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
  async getStockPrice(symbol: string): Promise<StockPriceResponse | null> {
    try {
      // Check shared cache first
      debugLog(`Checking cache for ${symbol}`);
      const cached = await this.getCachedPrice(symbol);
      if (cached) {
        debugLog(`✅ Using cached price for ${symbol}: $${cached.price}`);
        return cached;
      }
      debugLog(`❌ No cached price found for ${symbol}`);

      // If not cached and Alpha Vantage is available, try to fetch from Alpha Vantage
      if (process.env.ALPHA_VANTAGE_KEY) {
        debugLog(`Fetching fresh price for ${symbol} from Alpha Vantage`);
        try {
          const priceData = await alphaVantageStockService.getStockPrice(symbol);

          if (priceData) {
            // Cache the result in shared cache
            debugLog(`💾 Caching price for ${symbol}: $${priceData.price} for 1 day`);
            await this.cachePrice(symbol, priceData);
            return priceData;
          }
        } catch (error) {
          debugLog(`Alpha Vantage failed for ${symbol}, returning null:`, error);
        }
      } else {
        debugLog(`ALPHA_VANTAGE_KEY not available, returning null for ${symbol}`);
      }

      return null;
    } catch (error) {
      console.error('Error fetching stock price:', error);
      return null;
    }
  }

  /**
   * Fetch multiple stock prices in batch
   */
  async getMultipleStockPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    // Check shared cache for all symbols first
    const cachedResults = await sharedStockPriceCache.getMultipleCachedPrices(symbols);
    const symbolsToFetch: string[] = [];

    debugLog(`📦 Checking cache for ${symbols.length} symbols: ${symbols.join(', ')}`);

    symbols.forEach(symbol => {
      if (cachedResults[symbol]) {
        debugLog(`✅ Using cached price for ${symbol}: $${cachedResults[symbol]!.price}`);
        results[symbol] = cachedResults[symbol];
      } else {
        debugLog(`❌ No cached price for ${symbol}`);
        symbolsToFetch.push(symbol);
      }
    });

    debugLog(`🔄 Need to fetch ${symbolsToFetch.length} symbols from Alpha Vantage: ${symbolsToFetch.join(', ')}`);

    // Fetch uncached symbols from Alpha Vantage if available
    if (symbolsToFetch.length > 0) {
      if (process.env.ALPHA_VANTAGE_KEY) {
        debugLog(`Fetching fresh prices for: ${symbolsToFetch.join(', ')} from Alpha Vantage`);
        try {
          const alphaVantageResults = await alphaVantageStockService.getMultipleStockPrices(symbolsToFetch);

          // Cache and return results
          const pricesToCache: Record<string, StockPriceResponse | null> = {};
          symbolsToFetch.forEach(symbol => {
            results[symbol] = alphaVantageResults[symbol];
            if (alphaVantageResults[symbol]) {
              pricesToCache[symbol] = alphaVantageResults[symbol];
            }
          });

          // Cache all new prices in shared cache
          if (Object.keys(pricesToCache).length > 0) {
            await sharedStockPriceCache.cacheMultiplePrices(symbolsToFetch, pricesToCache);
          }
        } catch (error) {
          debugLog(`Alpha Vantage failed for symbols: ${symbolsToFetch.join(', ')}, returning null:`, error);
          symbolsToFetch.forEach(symbol => {
            results[symbol] = null;
          });
        }
      } else {
        debugLog(`ALPHA_VANTAGE_KEY not available, returning null for uncached symbols: ${symbolsToFetch.join(', ')}`);
        symbolsToFetch.forEach(symbol => {
          results[symbol] = null;
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
