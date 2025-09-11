// Factory pattern for stock price services
import { cachedStockService, CachedStockService } from './stock-price-cached';
import { finnhubStockService, FinnhubStockService } from './stock-price-finnhub';

export interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface StockPriceService {
  getStockPrice(symbol: string): Promise<StockPriceResponse | null>;
  getMultipleStockPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>>;
  getPriceComparison(currentPrice: number, strikePrice: number): {
    difference: number;
    percentDifference: number;
    isInTheMoney: boolean;
    isOutOfTheMoney: boolean;
    isAtTheMoney: boolean;
  };
}

export type StockPriceProvider = 'finnhub' | 'cached' | 'none';

export class StockPriceFactory {
  private static instance: StockPriceService | null = null;
  private static provider: StockPriceProvider = 'none';

  /**
   * Initialize the stock price service
   */
  static initialize(provider: StockPriceProvider): StockPriceService {
    this.provider = provider;

    switch (provider) {
      case 'finnhub':
        this.instance = finnhubStockService;
        break;
      case 'cached':
        this.instance = cachedStockService;
        break;
      case 'none':
      default:
        this.instance = new NoOpStockService();
        break;
    }

    return this.instance;
  }

  /**
   * Get the current stock price service instance
   */
  static getInstance(): StockPriceService {
    if (!this.instance) {
      return this.initialize('none');
    }
    return this.instance;
  }

  /**
   * Get the current provider
   */
  static getProvider(): StockPriceProvider {
    return this.provider;
  }

  /**
   * Check if a provider is available
   */
  static isProviderAvailable(provider: StockPriceProvider): boolean {
    switch (provider) {
      case 'finnhub':
        return !!process.env.FINNHUB_API_KEY;
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

    if (this.isProviderAvailable('finnhub')) {
      providers.push('finnhub');
    }

    return providers;
  }
}

/**
 * No-op service for when no stock price provider is configured
 */
class NoOpStockService implements StockPriceService {
  async getStockPrice(symbol: string): Promise<StockPriceResponse | null> {
    console.warn('No stock price provider configured');
    return null;
  }

  async getMultipleStockPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>> {
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

// Export the factory instance
export const stockPriceService = StockPriceFactory.getInstance();
