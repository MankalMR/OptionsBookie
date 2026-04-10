import { logger } from "@/lib/logger";
import { calculateTopTenConcentration } from "@/lib/etf-utils";
import type { EtfProfile, AlphaVantageEtfProfileResponse } from "@/types/etf";

export class AlphaVantageEtfProvider {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private isRateLimited: boolean = false;
  private rateLimitResetTime: number = 0;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_KEY || '';
  }

  private isCurrentlyRateLimited(): boolean {
    if (!this.isRateLimited) return false;

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
    this.rateLimitResetTime = Date.now() + (60 * 1000);
    logger.warn('Alpha Vantage ETF API rate limited. Will retry in 1 minute.');
  }

  async getEtfProfile(ticker: string): Promise<EtfProfile | null> {
    try {
      if (!this.apiKey) {
        logger.warn('ALPHA_VANTAGE_KEY not configured. ETF profiles will not be available.');
        return null;
      }

      if (this.isCurrentlyRateLimited()) {
        logger.info(`Skipping ETF profile for ${ticker} - Alpha Vantage API is rate limited`);
        return null;
      }

      const url = `${this.baseUrl}?function=ETF_PROFILE&symbol=${encodeURIComponent(ticker)}&apikey=${this.apiKey}`;
      logger.info(`Alpha Vantage ETF_PROFILE URL: ${url.replace(this.apiKey, '[REDACTED]')}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('Alpha Vantage API rate limit exceeded (429).');
          this.setRateLimited();
          return null;
        }
        throw new Error(`Alpha Vantage ETF API error: ${response.status}`);
      }

      const data = await response.json();

      if ('Error Message' in data) {
        logger.warn({ data0: data['Error Message'] }, `Alpha Vantage ETF error for ${ticker}:`);
        return null;
      }

      if ('Note' in data || 'Information' in data) {
        logger.warn({ data0: data['Note'] || data['Information'] }, 'Alpha Vantage ETF API limit reached:');
        this.setRateLimited();
        return null;
      }

      const etfData = data as AlphaVantageEtfProfileResponse;

      if (!etfData.net_assets && !etfData.holdings?.length) {
        logger.warn(`No ETF data found for ${ticker}`);
        return null;
      }

      const holdings = (etfData.holdings || []).map(h => ({
        symbol: h.symbol,
        description: h.description,
        weight: parseFloat(h.weight) || 0,
      }));

      const sectors = (etfData.sectors || []).map(s => ({
        sector: s.sector,
        weight: parseFloat(s.weight) || 0,
      }));

      const topTenWeight = calculateTopTenConcentration(holdings);

      return {
        ticker: ticker.toUpperCase(),
        fundName: null, // ETF_PROFILE doesn't return fund name; supplement via getEtfName
        issuer: null,
        netAssets: etfData.net_assets ? parseFloat(etfData.net_assets) : null,
        netExpenseRatio: etfData.net_expense_ratio ? parseFloat(etfData.net_expense_ratio) : null,
        dividendYield: etfData.dividend_yield ? parseFloat(etfData.dividend_yield) : null,
        dividendFrequency: null,
        exDividendDate: null,
        benchmarkIndex: null,
        assetCategory: null,
        inceptionDate: etfData.inception_date || null,
        portfolioTurnover: etfData.portfolio_turnover ? parseFloat(etfData.portfolio_turnover) : null,
        leveraged: etfData.leveraged || null,
        topHoldings: holdings,
        topTenConcentration: (topTenWeight !== null && topTenWeight > 0) ? topTenWeight : null,
        sectorAllocation: sectors,
        cachedAt: new Date().toISOString(),
        isStale: false,
        isSaved: false,
      };
    } catch (error) {
      logger.error({ error }, `Error fetching ETF profile for ${ticker}:`);
      return null;
    }
  }

  async getEtfName(ticker: string): Promise<string | null> {
    try {
      if (!this.apiKey) return null;

      if (this.isCurrentlyRateLimited()) {
        logger.info(`Skipping ETF name lookup for ${ticker} - rate limited`);
        return null;
      }

      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${this.apiKey}`;
      logger.info(`Alpha Vantage OVERVIEW URL: ${url.replace(this.apiKey, '[REDACTED]')}`);

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          this.setRateLimited();
          return null;
        }
        return null;
      }

      const data = await response.json();

      if ('Note' in data || 'Information' in data) {
        this.setRateLimited();
        return null;
      }

      if (data.Name) return data.Name;

      // Fallback: Try SYMBOL_SEARCH if OVERVIEW fails or is limited
      const searchUrl = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(ticker)}&apikey=${this.apiKey}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.bestMatches && searchData.bestMatches.length > 0) {
          // Look for an exact match
          const match = searchData.bestMatches.find((m: any) => m['1. symbol'] === ticker);
          if (match && match['2. name']) {
            return match['2. name'];
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error({ error }, `Error fetching ETF name for ${ticker}:`);
      return null;
    }
  }
}

// Singleton instance
export const alphaVantageEtfProvider = new AlphaVantageEtfProvider();
