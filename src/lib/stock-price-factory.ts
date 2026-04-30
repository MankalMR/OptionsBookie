// Factory pattern for stock price services
import { cachedStockService, CachedStockService } from './stock-price-cached';
import { finnhubStockService, FinnhubStockService } from './stock-price-finnhub';
import { alphaVantageStockService, AlphaVantageStockService } from './stock-price-alphavantage';
import { geminiStockService } from './stock-price-gemini';
import { logger } from "@/lib/logger";

export interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  isStale?: boolean;
  isAiGenerated?: boolean;
}

export interface StockPriceService {
  getStockPrice(symbol: string, activeSymbols?: string[]): Promise<StockPriceResponse | null>;
  getMultipleStockPrices(symbols: string[], activeSymbols?: string[]): Promise<Record<string, StockPriceResponse | null>>;
  getPriceComparison(currentPrice: number, strikePrice: number): {
    difference: number;
    percentDifference: number;
    isInTheMoney: boolean;
    isOutOfTheMoney: boolean;
    isAtTheMoney: boolean;
  };
}

export type StockPriceProvider = 'alphavantage' | 'finnhub' | 'gemini' | 'cached' | 'none';

export class StockPriceFactory {
  /**
   * Initialize and return the stock price service for a given provider
   */
  static initialize(provider: StockPriceProvider): StockPriceService {
    switch (provider) {
      case 'alphavantage':
        return alphaVantageStockService;
      case 'finnhub':
        return finnhubStockService;
      case 'gemini':
        return geminiStockService;
      case 'cached':
        return cachedStockService;
      case 'none':
      default:
        return new NoOpStockService();
    }
  }

  /**
   * Check if a provider is available
   */
  static isProviderAvailable(provider: StockPriceProvider): boolean {
    switch (provider) {
      case 'alphavantage':
        return !!process.env.ALPHA_VANTAGE_KEY;
      case 'finnhub':
        return !!process.env.FINNHUB_API_KEY;
      case 'gemini':
        return !!process.env.GEMINI_API_KEY;
      case 'cached':
        return true; // No API key required
      case 'none':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): StockPriceProvider[] {
    const providers: StockPriceProvider[] = ['none'];

    if (this.isProviderAvailable('cached')) {
      providers.push('cached');
    }

    if (this.isProviderAvailable('alphavantage')) {
      providers.push('alphavantage');
    }

    if (this.isProviderAvailable('finnhub')) {
      providers.push('finnhub');
    }

    if (this.isProviderAvailable('gemini')) {
      providers.push('gemini');
    }

    return providers;
  }
}

/**
 * No-op service for when no stock price provider is configured
 */
class NoOpStockService implements StockPriceService {
  async getStockPrice(symbol: string, activeSymbols?: string[]): Promise<StockPriceResponse | null> {
    logger.warn('No stock price provider configured');
    return null;
  }

  async getMultipleStockPrices(symbols: string[], activeSymbols?: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};
    symbols.forEach(symbol => {
      results[symbol] = null;
    });
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

