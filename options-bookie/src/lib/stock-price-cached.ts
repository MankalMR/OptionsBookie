// Stock price service with shared caching (works with Finnhub data)
import { sharedStockPriceCache } from './stock-price-cache';
import { finnhubStockService } from './stock-price-finnhub';

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
      console.log(`Checking cache for ${symbol}`);
      const cached = await this.getCachedPrice(symbol);
      if (cached) {
        console.log(`✅ Using cached price for ${symbol}: $${cached.price}`);
        return cached;
      }
      console.log(`❌ No cached price found for ${symbol}`);

      // If not cached and Finnhub is available, try to fetch from Finnhub
      if (process.env.FINNHUB_API_KEY) {
        console.log(`Fetching fresh price for ${symbol} from Finnhub`);
        try {
          const priceData = await finnhubStockService.getStockPrice(symbol);

          if (priceData) {
            // Cache the result in shared cache
            console.log(`💾 Caching price for ${symbol}: $${priceData.price} for 1 day`);
            await this.cachePrice(symbol, priceData);
            return priceData;
          }
        } catch (error) {
          console.log(`Finnhub failed for ${symbol}, returning null:`, error);
        }
      } else {
        console.log(`FINNHUB_API_KEY not available, returning null for ${symbol}`);
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

    console.log(`📦 Checking cache for ${symbols.length} symbols: ${symbols.join(', ')}`);

    symbols.forEach(symbol => {
      if (cachedResults[symbol]) {
        console.log(`✅ Using cached price for ${symbol}: $${cachedResults[symbol]!.price}`);
        results[symbol] = cachedResults[symbol];
      } else {
        console.log(`❌ No cached price for ${symbol}`);
        symbolsToFetch.push(symbol);
      }
    });

    console.log(`🔄 Need to fetch ${symbolsToFetch.length} symbols from Finnhub: ${symbolsToFetch.join(', ')}`);

    // Fetch uncached symbols from Finnhub if available
    if (symbolsToFetch.length > 0) {
      if (process.env.FINNHUB_API_KEY) {
        console.log(`Fetching fresh prices for: ${symbolsToFetch.join(', ')} from Finnhub`);
        try {
          const finnhubResults = await finnhubStockService.getMultipleStockPrices(symbolsToFetch);

          // Cache and return results
          const pricesToCache: Record<string, StockPriceResponse | null> = {};
          symbolsToFetch.forEach(symbol => {
            results[symbol] = finnhubResults[symbol];
            if (finnhubResults[symbol]) {
              pricesToCache[symbol] = finnhubResults[symbol];
            }
          });

          // Cache all new prices in shared cache
          if (Object.keys(pricesToCache).length > 0) {
            await sharedStockPriceCache.cacheMultiplePrices(symbolsToFetch, pricesToCache);
          }
        } catch (error) {
          console.log(`Finnhub failed for symbols: ${symbolsToFetch.join(', ')}, returning null:`, error);
          symbolsToFetch.forEach(symbol => {
            results[symbol] = null;
          });
        }
      } else {
        console.log(`FINNHUB_API_KEY not available, returning null for uncached symbols: ${symbolsToFetch.join(', ')}`);
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
