// Historical data cache using Supabase
import { createClient } from '@supabase/supabase-js';

export interface HistoricalDataPoint {
  date: string;
  close: number;
  monthlyReturn?: number;
}

interface CachedHistoricalData {
  symbol: string;
  data: HistoricalDataPoint[];
  cached_at: string;
  expires_at: string;
}

export class HistoricalDataCache {
  private supabase;
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private readonly TABLE_NAME = 'historical_data_cache';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables for historical data cache');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get cached historical data
   */
  async getCachedData(symbol: string): Promise<HistoricalDataPoint[] | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        console.log(`No cached historical data found for ${symbol}`);
        return null;
      }

      console.log(`Retrieved cached historical data for ${symbol} (${data.data.length} data points)`);
      return data.data;
    } catch (error) {
      console.error('Error fetching cached historical data:', error);
      return null;
    }
  }

  /**
   * Cache historical data
   */
  async cacheData(symbol: string, historicalData: HistoricalDataPoint[]): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

      const cacheData: CachedHistoricalData = {
        symbol: symbol.toUpperCase(),
        data: historicalData,
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      };

      // Use upsert to update existing or insert new
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .upsert(cacheData, { onConflict: 'symbol' });

      if (error) {
        console.error('Error caching historical data:', error);
      } else {
        console.log(`Cached historical data for ${symbol} (${historicalData.length} data points) until ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      console.error('Error caching historical data:', error);
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
        console.error('Error clearing expired historical data cache:', error);
      } else {
        console.log('Cleared expired historical data cache entries');
      }
    } catch (error) {
      console.error('Error clearing expired historical data cache:', error);
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
        console.error('Error getting historical data cache stats:', totalError || expiredError);
        return { totalEntries: 0, expiredEntries: 0, validEntries: 0 };
      }

      const totalEntries = total?.length || 0;
      const expiredEntries = expired?.length || 0;
      const validEntries = totalEntries - expiredEntries;

      return { totalEntries, expiredEntries, validEntries };
    } catch (error) {
      console.error('Error getting historical data cache stats:', error);
      return { totalEntries: 0, expiredEntries: 0, validEntries: 0 };
    }
  }

  /**
   * Force refresh cache for a symbol (useful for testing or manual refresh)
   */
  async forceRefresh(symbol: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('symbol', symbol.toUpperCase());

      if (error) {
        console.error(`Error force refreshing cache for ${symbol}:`, error);
      } else {
        console.log(`Force refreshed cache for ${symbol}`);
      }
    } catch (error) {
      console.error(`Error force refreshing cache for ${symbol}:`, error);
    }
  }
}

// Singleton instance
export const historicalDataCache = new HistoricalDataCache();
