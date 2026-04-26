// Stock price service with shared caching
import { sharedStockPriceCache } from './stock-price-cache';
import { logger } from "@/lib/logger";
import { StockPriceResponse, StockPriceService } from "./stock-price-factory";

export class CachedStockService implements StockPriceService {

  /**
   * Get cached price data from shared cache
   */
  async getStockPrice(symbol: string, activeSymbols: string[] = []): Promise<StockPriceResponse | null> {
    if (!symbol) return null;
    const normalizedSymbol = symbol.toUpperCase();

    try {
      logger.info(`Checking cache for ${normalizedSymbol}`);
      const cached = await sharedStockPriceCache.getCachedPrice(normalizedSymbol);
      
      if (cached) {
        logger.info(`✅ Using cached price for ${normalizedSymbol}: $${cached.price} (Stale: ${!!cached.isStale})`);
        return cached;
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Error fetching stock price from cache:');
      return null;
    }
  }

  /**
   * Fetch multiple stock prices from cache
   */
  async getMultipleStockPrices(symbols: string[], activeSymbols: string[] = []): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    try {
      const cachedResults = await sharedStockPriceCache.getMultipleCachedPrices(symbols);
      logger.info(`📦 Checking cache for ${symbols.length} symbols: ${symbols.join(', ')}`);

      symbols.forEach(symbol => {
        const normalizedSymbol = symbol.toUpperCase();
        const cached = cachedResults[symbol];

        if (cached) {
          logger.info(`✅ Using cached price for ${symbol}: $${cached.price} (Stale: ${!!cached.isStale})`);
          results[symbol] = cached;
        } else {
          logger.info(`⚪ No cache for ${symbol}, returning null`);
          results[symbol] = null;
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching multiple stock prices from cache:');
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
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
