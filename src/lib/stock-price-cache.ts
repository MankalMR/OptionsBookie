// Shared stock price cache using Supabase
import { createClient } from '@supabase/supabase-js';

interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface CachedPriceData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: string;
  cached_at: string;
  expires_at: string;
}

export class SharedStockPriceCache {
  private supabase;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  private readonly TABLE_NAME = 'stock_price_cache';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables for cache');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get cached price data
   */
  async getCachedPrice(symbol: string): Promise<StockPriceResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.change_percent,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Error fetching cached price:', error);
      return null;
    }
  }

  /**
   * Cache price data
   */
  async cachePrice(symbol: string, priceData: StockPriceResponse): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

      const cacheData: CachedPriceData = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        change: priceData.change,
        change_percent: priceData.changePercent,
        timestamp: priceData.timestamp,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      };

      // Use upsert to update existing or insert new
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .upsert(cacheData, { onConflict: 'symbol' });

      if (error) {
        console.error('Error caching price:', error);
      } else {
        console.log(`Cached price for ${symbol} until ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      console.error('Error caching price:', error);
    }
  }

  /**
   * Get multiple cached prices
   */
  async getMultipleCachedPrices(symbols: string[]): Promise<Record<string, StockPriceResponse | null>> {
    const results: Record<string, StockPriceResponse | null> = {};

    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .in('symbol', symbols.map(s => s.toUpperCase()))
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching cached prices:', error);
        symbols.forEach(symbol => {
          results[symbol] = null;
        });
        return results;
      }

      // Initialize all symbols as null
      symbols.forEach(symbol => {
        results[symbol] = null;
      });

      // Map cached data
      data?.forEach(item => {
        results[item.symbol] = {
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          changePercent: item.change_percent,
          timestamp: item.timestamp
        };
      });

    } catch (error) {
      console.error('Error fetching multiple cached prices:', error);
      symbols.forEach(symbol => {
        results[symbol] = null;
      });
    }

    return results;
  }

  /**
   * Cache multiple prices
   */
  async cacheMultiplePrices(symbols: string[], prices: Record<string, StockPriceResponse | null>): Promise<void> {
    const cacheData: CachedPriceData[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

    symbols.forEach(symbol => {
      const priceData = prices[symbol];
      if (priceData) {
        cacheData.push({
          symbol: symbol.toUpperCase(),
          price: priceData.price,
          change: priceData.change,
          change_percent: priceData.changePercent,
          timestamp: priceData.timestamp,
          cached_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        });
      }
    });

    if (cacheData.length > 0) {
      try {
        const { error } = await this.supabase
          .from(this.TABLE_NAME)
          .upsert(cacheData, { onConflict: 'symbol' });

        if (error) {
          console.error('Error caching multiple prices:', error);
        } else {
          console.log(`Cached ${cacheData.length} prices until ${expiresAt.toISOString()}`);
        }
      } catch (error) {
        console.error('Error caching multiple prices:', error);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error clearing expired cache:', error);
      } else {
        console.log('Cleared expired cache entries');
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
  }> {
    try {
      const { data: total, error: totalError } = await this.supabase
        .from(this.TABLE_NAME)
        .select('symbol', { count: 'exact' });

      const { data: expired, error: expiredError } = await this.supabase
        .from(this.TABLE_NAME)
        .select('symbol', { count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      if (totalError || expiredError) {
        console.error('Error getting cache stats:', totalError || expiredError);
        return { totalEntries: 0, expiredEntries: 0, validEntries: 0 };
      }

      const totalEntries = total?.length || 0;
      const expiredEntries = expired?.length || 0;
      const validEntries = totalEntries - expiredEntries;

      return { totalEntries, expiredEntries, validEntries };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, expiredEntries: 0, validEntries: 0 };
    }
  }
}

// Singleton instance
export const sharedStockPriceCache = new SharedStockPriceCache();
