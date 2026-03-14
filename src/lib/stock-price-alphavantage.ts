// Stock price service using Alpha Vantage API
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

interface AlphaVantageQuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
    "07. latest trading day": string;
  };
}

interface AlphaVantageTimeSeriesResponse {
  "Monthly Time Series": {
    [date: string]: {
      "1. open": string;
      "2. high": string;
      "3. low": string;
      "4. close": string;
      "5. volume": string;
    };
  };
  "Meta Data": {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Time Zone": string;
  };
}

export interface HistoricalDataPoint {
  date: string;
  close: number;
  monthlyReturn?: number;
}

export class AlphaVantageStockService implements StockPriceService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private isRateLimited: boolean = false;
  private rateLimitResetTime: number = 0;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_KEY || '';
  }

  private isCurrentlyRateLimited(): boolean {
    if (!this.isRateLimited) return false;

    // Check if rate limit has expired (Alpha Vantage: 25 requests/day, 5 calls/minute)
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
    // Set reset time to 1 minute from now (Alpha Vantage has minute-based rate limits)
    this.rateLimitResetTime = Date.now() + (60 * 1000);
    console.warn('Alpha Vantage API rate limited. Will retry in 1 minute.');
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
        console.warn('ALPHA_VANTAGE_KEY not configured. Stock prices will not be available.');
        return null;
      }

      // Check if we're currently rate limited
      if (this.isCurrentlyRateLimited()) {
        console.log(`Skipping ${symbol} - Alpha Vantage API is rate limited`);
        return null;
      }

      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      console.log(`Alpha Vantage API URL: ${url.replace(this.apiKey, '[REDACTED]')}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Alpha Vantage API rate limit exceeded (429). Too many requests.');
          this.setRateLimited();
          return null;
        }
        if (response.status === 403) {
          console.warn('Alpha Vantage API key is invalid or expired. Please check your ALPHA_VANTAGE_KEY environment variable.');
          return null;
        }
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageQuoteResponse = await response.json();

      // Check for API error responses
      if ('Error Message' in data) {
        throw new Error(`Alpha Vantage API error: ${(data as any)['Error Message']}`);
      }

      if ('Note' in data) {
        console.warn('Alpha Vantage API rate limit reached:', (data as any)['Note']);
        this.setRateLimited();
        return null;
      }

      if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
        throw new Error('No price data available for symbol');
      }

      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercentStr = quote['10. change percent'].replace('%', '');
      const changePercent = parseFloat(changePercentStr);

      return {
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercent,
        timestamp: new Date().toISOString() // Alpha Vantage doesn't provide timestamp in quote
      };
    } catch (error) {
      console.error('Error fetching stock price from Alpha Vantage:', error);
      return null;
    }
  }

  async getMultipleStockPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    if (!this.apiKey) {
      console.warn('ALPHA_VANTAGE_KEY not configured. Stock prices will not be available.');
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
      return results;
    }

    // Check if we're rate limited before making any calls
    if (this.isCurrentlyRateLimited()) {
      console.log('Alpha Vantage API is rate limited, returning null for all symbols');
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
      return results;
    }

    // Alpha Vantage quote endpoint only accepts one symbol at a time
    // Fetch symbols sequentially to avoid rate limiting (5 calls/minute on free tier)
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

        // Add a delay to respect rate limits (5 API calls/minute on free tier)
        await new Promise(resolve => setTimeout(resolve, 12500)); // 12.5 seconds between calls
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        results[symbol] = null;
      }
    }

    return results;
  }

  /**
   * Get historical monthly data for a symbol (primarily for S&P 500 via SPY)
   */
  async getHistoricalMonthlyData(symbol: string, months: number = 24): Promise<HistoricalDataPoint[]> {
    try {
      if (!this.apiKey) {
        console.warn('ALPHA_VANTAGE_KEY not configured. Historical data will not be available.');
        return [];
      }

      if (this.isCurrentlyRateLimited()) {
        console.log(`Skipping historical data for ${symbol} - Alpha Vantage API is rate limited`);
        return [];
      }

      const url = `${this.baseUrl}?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${this.apiKey}`;
      console.log(`Alpha Vantage Historical API URL: ${url.replace(this.apiKey, '[REDACTED]')}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Alpha Vantage API rate limit exceeded (429). Too many requests.');
          this.setRateLimited();
          return [];
        }
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageTimeSeriesResponse = await response.json();

      // Check for API error responses
      if ('Error Message' in data) {
        throw new Error(`Alpha Vantage API error: ${(data as any)['Error Message']}`);
      }

      if ('Note' in data) {
        console.warn('Alpha Vantage API rate limit reached:', (data as any)['Note']);
        this.setRateLimited();
        return [];
      }

      if (!data['Monthly Time Series']) {
        throw new Error('No historical data available for symbol');
      }

      const timeSeries = data['Monthly Time Series'];
      const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

      // Limit to requested number of months
      const limitedDates = dates.slice(0, months);

      const historicalData: HistoricalDataPoint[] = [];
      let previousClose: number | null = null;

      // Process in chronological order (oldest first) for return calculation
      for (let i = limitedDates.length - 1; i >= 0; i--) {
        const date = limitedDates[i];
        const dayData = timeSeries[date];
        const close = parseFloat(dayData['4. close']);

        let monthlyReturn: number | undefined;
        if (previousClose !== null) {
          monthlyReturn = ((close - previousClose) / previousClose) * 100;
        }

        historicalData.push({
          date,
          close,
          monthlyReturn
        });

        previousClose = close;
      }

      // Return in reverse chronological order (most recent first)
      return historicalData.reverse();
    } catch (error) {
      console.error('Error fetching historical data from Alpha Vantage:', error);
      return [];
    }
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
export const alphaVantageStockService = new AlphaVantageStockService();
