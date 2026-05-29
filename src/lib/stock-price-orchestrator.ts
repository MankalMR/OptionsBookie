import { StockPriceFactory, StockPriceResponse, StockPriceService } from './stock-price-factory';
import { sharedStockPriceCache } from './stock-price-cache';
import { logger } from "@/lib/logger";

export class OrchestratorStockService implements StockPriceService {

  async getStockPrice(symbol: string, activeSymbols: string[] = []): Promise<StockPriceResponse | null> {
    const results = await this.getMultipleStockPrices([symbol], activeSymbols);
    return results[symbol] || null;
  }

  async getMultipleStockPrices(symbols: string[], activeSymbols: string[] = []): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};
    const symbolsToFetch: string[] = [];
    const activeSymbolsUpper = activeSymbols.map(s => s.toUpperCase());

    // 0. Initialize results
    symbols.forEach(s => results[s] = null);

    // 1. Check shared cache first (Fresh data only)
    const cachedResults = await sharedStockPriceCache.getMultipleCachedPrices(symbols);

    symbols.forEach(symbol => {
      const normalizedSymbol = symbol.toUpperCase();
      const isActive = activeSymbolsUpper.length === 0 || activeSymbolsUpper.includes(normalizedSymbol);
      const cached = cachedResults[symbol];

      if (cached && (!cached.isStale || !isActive)) {
        logger.info(`✅ Using cached fresh/inactive price for ${symbol}`);
        results[symbol] = cached;
      } else if (isActive) {
        symbolsToFetch.push(symbol);
      } else {
        results[symbol] = cached || null;
      }
    });

    if (symbolsToFetch.length === 0) return results;

    let currentUncached = [...symbolsToFetch];
    const pricesToCache: Record<string, StockPriceResponse | null> = {};

    // 2. Try Alpha Vantage
    if (StockPriceFactory.isProviderAvailable('alphavantage')) {
      logger.info(`🔄 Trying Alpha Vantage for: ${currentUncached.join(', ')}`);
      const avService = StockPriceFactory.initialize('alphavantage');
      const avResults = await avService.getMultipleStockPrices(currentUncached);

      currentUncached.forEach(symbol => {
        if (avResults[symbol]) {
          results[symbol] = avResults[symbol];
          pricesToCache[symbol] = avResults[symbol];
        }
      });
      currentUncached = currentUncached.filter(s => !results[s]);
    }

    // 3. Try Finnhub
    if (currentUncached.length > 0 && StockPriceFactory.isProviderAvailable('finnhub')) {
      logger.info(`🔄 Trying Finnhub for: ${currentUncached.join(', ')}`);
      const fhService = StockPriceFactory.initialize('finnhub');
      const fhResults = await fhService.getMultipleStockPrices(currentUncached);

      currentUncached.forEach(symbol => {
        if (fhResults[symbol]) {
          results[symbol] = fhResults[symbol];
          pricesToCache[symbol] = fhResults[symbol];
        }
      });
      currentUncached = currentUncached.filter(s => !results[s]);
    }

    // Cache AV and FH successes
    if (Object.keys(pricesToCache).length > 0) {
      await sharedStockPriceCache.cacheMultiplePrices(Object.keys(pricesToCache), pricesToCache);
    }

    // 4. Try Gemini AI (DO NOT CACHE)
    if (currentUncached.length > 0 && StockPriceFactory.isProviderAvailable('gemini')) {
      logger.info(`✨ Trying Gemini AI fallback for: ${currentUncached.join(', ')}`);
      const geminiService = StockPriceFactory.initialize('gemini');
      const geminiResults = await geminiService.getMultipleStockPrices(currentUncached);

      currentUncached.forEach(symbol => {
        if (geminiResults[symbol]) {
          // Explicitly flag as AI generated and DO NOT cache
          const data = geminiResults[symbol]!;
          data.isAiGenerated = true;
          results[symbol] = data;
        }
      });
      currentUncached = currentUncached.filter(s => !results[s]);
    }

    // 5. Zero-Null Policy: Fallback to stale cache as a last resort
    if (currentUncached.length > 0) {
      logger.info(`⚠️ Live fetches failed for: ${currentUncached.join(', ')}. Checking for stale cache fallback.`);
      currentUncached.forEach(symbol => {
        if (cachedResults[symbol]) {
          logger.info(`✅ Using stale cache recovery for ${symbol} - Zero-Null Policy`);
          results[symbol] = cachedResults[symbol];
        }
      });
    }

    return results;
  }

  getPriceComparison(currentPrice: number, strikePrice: number) {
    const difference = currentPrice - strikePrice;
    const percentDifference = (difference / strikePrice) * 100;

    return {
      difference,
      percentDifference,
      isInTheMoney: difference > 0,
      isOutOfTheMoney: difference < 0,
      isAtTheMoney: Math.abs(difference) < (strikePrice * 0.01)
    };
  }
}

export const orchestratorStockService = new OrchestratorStockService();
