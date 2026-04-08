import { createClient } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";
import type { EtfCacheRow, EtfProfile, UserSavedEtfRow } from "@/types/etf";

export class EtfCacheService {
  private supabase;
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  private readonly TABLE_NAME = 'etf_cache';
  private readonly SAVED_TABLE = 'user_saved_etfs';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables for ETF cache');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getCachedEtf(ticker: string): Promise<{ data: EtfCacheRow; isStale: boolean } | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .single();

      if (error || !data) {
        return null;
      }

      const isStale = new Date(data.expires_at) < new Date();
      return { data: data as EtfCacheRow, isStale };
    } catch (error) {
      logger.error({ error }, `Error fetching cached ETF for ${ticker}:`);
      return null;
    }
  }

  async cacheEtf(ticker: string, profile: EtfProfile): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_TTL);

      const row = {
        ticker: ticker.toUpperCase(),
        fund_name: profile.fundName,
        net_assets: profile.netAssets,
        net_expense_ratio: profile.netExpenseRatio,
        dividend_yield: profile.dividendYield,
        portfolio_turnover: profile.portfolioTurnover,
        inception_date: profile.inceptionDate,
        leveraged: profile.leveraged,
        issuer: profile.issuer,
        dividend_frequency: profile.dividendFrequency,
        ex_dividend_date: profile.exDividendDate,
        benchmark_index: profile.benchmarkIndex,
        asset_category: profile.assetCategory,
        top_holdings: profile.topHoldings,
        sector_allocation: profile.sectorAllocation,
        provider: 'alphavantage',
        cached_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .upsert(row, { onConflict: 'ticker' });

      if (error) {
        logger.error({ error }, `Error caching ETF data for ${ticker}:`);
      } else {
        logger.info(`Cached ETF data for ${ticker} until ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      logger.error({ error }, `Error caching ETF data for ${ticker}:`);
    }
  }

  async searchCache(query: string): Promise<EtfCacheRow[]> {
    try {
      const upperQuery = query.toUpperCase();

      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .or(`ticker.ilike.${upperQuery}%,fund_name.ilike.%${query}%`)
        .limit(20);

      if (error) {
        logger.error({ error }, 'Error searching ETF cache:');
        return [];
      }

      return (data || []) as EtfCacheRow[];
    } catch (error) {
      logger.error({ error }, 'Error searching ETF cache:');
      return [];
    }
  }

  async clearExpired(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error({ error }, 'Error clearing expired ETF cache:');
      } else {
        logger.info('Cleared expired ETF cache entries');
      }
    } catch (error) {
      logger.error({ error }, 'Error clearing expired ETF cache:');
    }
  }

  async getUserSavedTickers(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.SAVED_TABLE)
        .select('ticker')
        .eq('user_id', userId);

      if (error) {
        logger.error({ error }, 'Error fetching saved ETF tickers:');
        return [];
      }

      return (data || []).map(row => row.ticker);
    } catch (error) {
      logger.error({ error }, 'Error fetching saved ETF tickers:');
      return [];
    }
  }

  async saveEtf(userId: string, ticker: string, notes?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.SAVED_TABLE)
        .upsert(
          {
            user_id: userId,
            ticker: ticker.toUpperCase(),
            notes: notes || null,
          },
          { onConflict: 'user_id,ticker' }
        );

      if (error) {
        logger.error({ error }, `Error saving ETF ${ticker}:`);
      } else {
        logger.info(`Saved ETF ${ticker} for user ${userId}`);
      }
    } catch (error) {
      logger.error({ error }, `Error saving ETF ${ticker}:`);
    }
  }

  async unsaveEtf(userId: string, ticker: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.SAVED_TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('ticker', ticker.toUpperCase());

      if (error) {
        logger.error({ error }, `Error unsaving ETF ${ticker}:`);
      } else {
        logger.info(`Unsaved ETF ${ticker} for user ${userId}`);
      }
    } catch (error) {
      logger.error({ error }, `Error unsaving ETF ${ticker}:`);
    }
  }

  async getSavedEtfs(userId: string): Promise<Array<UserSavedEtfRow & Partial<EtfCacheRow>>> {
    try {
      const { data: savedRows, error: savedError } = await this.supabase
        .from(this.SAVED_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (savedError || !savedRows?.length) {
        if (savedError) logger.error({ error: savedError }, 'Error fetching saved ETFs:');
        return [];
      }

      const tickers = savedRows.map(r => r.ticker);

      const { data: cacheRows, error: cacheError } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .in('ticker', tickers);

      if (cacheError) {
        logger.error({ error: cacheError }, 'Error fetching cached data for saved ETFs:');
      }

      const cacheMap = new Map<string, EtfCacheRow>();
      if (cacheRows) {
        for (const row of cacheRows) {
          cacheMap.set(row.ticker, row as EtfCacheRow);
        }
      }

      return savedRows.map(saved => ({
        ...saved,
        ...cacheMap.get(saved.ticker),
        // Ensure saved row fields take precedence for id, user_id, notes, saved_at
        id: saved.id,
        user_id: saved.user_id,
        ticker: saved.ticker,
        notes: saved.notes,
        saved_at: saved.saved_at,
      })) as Array<UserSavedEtfRow & Partial<EtfCacheRow>>;
    } catch (error) {
      logger.error({ error }, 'Error fetching saved ETFs:');
      return [];
    }
  }
}

// Singleton instance
export const etfCacheService = new EtfCacheService();
