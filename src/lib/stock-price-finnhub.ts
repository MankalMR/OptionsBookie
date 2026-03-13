// Stock price service using Finnhub API
interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface StockPriceService {
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

interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export class FinnhubStockService implements StockPriceService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';
  private isRateLimited: boolean = false;
  private rateLimitResetTime: number = 0;

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY || '';
  }

  private isCurrentlyRateLimited(): boolean {
    if (!this.isRateLimited) return false;

    // Check if rate limit has expired (assume 1 minute for Finnhub)
    const now = Date.now();
    if (now > this.rateLimitResetTime) {
      this.isRateLimited = false;
      this.rateLimitResetTime = 0;
      return false;
    }

    return true;
  }

  private setRateLimited(): void {
    this.isRateLimited = true;
    // Set reset time to 1 minute from now (Finnhub typically has minute-based rate limits)
    this.rateLimitResetTime = Date.now() + (60 * 1000);
    console.warn('Finnhub API rate limited. Will retry in 1 minute.');
  }

  public getRateLimitStatus(): { isLimited: boolean; resetTime?: Date } {
    return {
      isLimited: this.isCurrentlyRateLimited(),
      resetTime: this.isRateLimited ? new Date(this.rateLimitResetTime) : undefined
    };
  }

  async getStockPrice(symbol: string): Promise<StockPriceResponse | null> {
    try {
      if (!this.apiKey) {
        console.warn('FINNHUB_API_KEY not configured. Stock prices will not be available.');
        return null;
      }

      // Check if we're currently rate limited
      if (this.isCurrentlyRateLimited()) {
        console.log(`Skipping ${symbol} - Finnhub API is rate limited`);
        return null;
      }

      const url = `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`;
      console.log(`Finnhub API URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Finnhub API rate limit exceeded (429). Too many requests.');
          this.setRateLimited();
          return null;
        }
        if (response.status === 403) {
          console.warn('Finnhub API key is invalid or expired. Please check your FINNHUB_API_KEY environment variable.');
          return null;
        }
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data: FinnhubQuoteResponse = await response.json();

      if (!data || typeof data.c !== 'number') {
        throw new Error('No price data available for symbol');
      }

      return {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change: data.d || 0,
        changePercent: data.dp || 0,
        timestamp: new Date(data.t ? data.t * 1000 : Date.now()).toISOString()
      };
    } catch (error) {
      console.error('Error fetching stock price from Finnhub:', error);
      return null;
    }
  }

  async getMultipleStockPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    if (!this.apiKey) {
      console.warn('FINNHUB_API_KEY not configured. Stock prices will not be available.');
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
      return results;
    }

    // Check if we're rate limited before making any calls
    if (this.isCurrentlyRateLimited()) {
      console.log('Finnhub API is rate limited, returning null for all symbols');
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
      return results;
    }

    // Finnhub quote endpoint only accepts one symbol at a time
    // Fetch symbols sequentially to avoid rate limiting
    for (const symbol of symbols) {
      try {
        // Check rate limit before each call
        if (this.isCurrentlyRateLimited()) {
          console.log(`Rate limit hit, skipping remaining symbols: ${symbols.slice(symbols.indexOf(symbol)).join(', ')}`);
          // Set remaining symbols to null
          symbols.slice(symbols.indexOf(symbol)).forEach(remainingSymbol => {
            results[remainingSymbol] = null;
          });
          break;
        }

        const priceData = await this.getStockPrice(symbol);
        results[symbol] = priceData;

        // Add a small delay to respect rate limits (60 API calls/minute on free tier)
        await new Promise(resolve => setTimeout(resolve, 1100)); // Just over 1 second
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        results[symbol] = null;
      }
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
      isAtTheMoney: Math.abs(difference) < (strikePrice * 0.01) // Within 1%
    };
  }
}

// Singleton instance
export const finnhubStockService = new FinnhubStockService();

