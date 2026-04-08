import type { EtfProfile } from '@/types/etf';

// Set env vars BEFORE importing EtfCacheService (singleton executes on module load)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock Supabase - use a stable reference that jest.mock hoisting can capture
const mockFromFn = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: any[]) => mockFromFn(...args),
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { EtfCacheService } from './etf-cache';

// Chain helper - returns a chainable mock where every method returns `this`,
// and the chain is also a thenable so `await supabase.from(...).select(...).eq(...)` resolves.
function chainTo(result: { data?: any; error?: any }) {
  const handler: Record<string, any> = {};
  // Make every chained method return the handler itself
  const methods = ['select', 'eq', 'single', 'or', 'limit', 'upsert', 'delete', 'lt', 'in', 'order'];
  for (const m of methods) {
    handler[m] = jest.fn().mockReturnValue(handler);
  }
  // Make the handler thenable so it resolves when awaited at any point in the chain
  handler.then = (resolve: any) => resolve(result);
  return handler;
}

describe('EtfCacheService', () => {
  let service: EtfCacheService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    service = new EtfCacheService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockProfile: EtfProfile = {
    ticker: 'QQQ',
    fundName: 'Invesco QQQ Trust',
    issuer: null,
    netAssets: 365600000000,
    netExpenseRatio: 0.002,
    dividendYield: 0.0048,
    dividendFrequency: null,
    exDividendDate: null,
    benchmarkIndex: null,
    assetCategory: null,
    inceptionDate: '1999-03-10',
    portfolioTurnover: 0.08,
    leveraged: 'NO',
    topHoldings: [{ symbol: 'NVDA', description: 'NVIDIA CORP', weight: 0.0943 }],
    topTenConcentration: 0.561,
    sectorAllocation: [{ sector: 'IT', weight: 0.517 }],
    cachedAt: new Date().toISOString(),
    isStale: false,
    isSaved: false,
  };

  const freshCacheRow = {
    ticker: 'QQQ',
    fund_name: 'Invesco QQQ Trust',
    net_assets: 365600000000,
    net_expense_ratio: 0.002,
    dividend_yield: 0.0048,
    portfolio_turnover: 0.08,
    inception_date: '1999-03-10',
    leveraged: 'NO',
    top_holdings: [{ symbol: 'NVDA', description: 'NVIDIA CORP', weight: 0.0943 }],
    sector_allocation: [{ sector: 'IT', weight: 0.517 }],
    provider: 'alphavantage',
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // future = fresh
    updated_at: new Date().toISOString(),
  };

  const staleCacheRow = {
    ...freshCacheRow,
    expires_at: new Date(Date.now() - 86400000).toISOString(), // past = stale
  };

  it('should throw if Supabase env vars are missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';

    expect(() => new EtfCacheService()).toThrow('Missing required Supabase environment variables');
  });

  describe('getCachedEtf', () => {
    it('should return fresh cached data', async () => {
      const handler = chainTo({ data: freshCacheRow, error: null });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getCachedEtf('QQQ');

      expect(mockFromFn).toHaveBeenCalledWith('etf_cache');
      expect(handler.eq).toHaveBeenCalledWith('ticker', 'QQQ');
      expect(result).not.toBeNull();
      expect(result!.data.ticker).toBe('QQQ');
      expect(result!.isStale).toBe(false);
    });

    it('should mark stale data correctly', async () => {
      const handler = chainTo({ data: staleCacheRow, error: null });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getCachedEtf('QQQ');

      expect(result).not.toBeNull();
      expect(result!.isStale).toBe(true);
    });

    it('should return null when not found', async () => {
      const handler = chainTo({ data: null, error: { message: 'Not found' } });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getCachedEtf('XYZ');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const handler = chainTo({ data: null, error: { message: 'DB error' } });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getCachedEtf('QQQ');

      expect(result).toBeNull();
    });

    it('should uppercase the ticker', async () => {
      const handler = chainTo({ data: freshCacheRow, error: null });
      mockFromFn.mockReturnValue(handler);

      await service.getCachedEtf('qqq');

      expect(handler.eq).toHaveBeenCalledWith('ticker', 'QQQ');
    });
  });

  describe('cacheEtf', () => {
    it('should upsert ETF data with correct TTL', async () => {
      const handler = chainTo({ error: null });
      mockFromFn.mockReturnValue(handler);

      await service.cacheEtf('QQQ', mockProfile);

      expect(mockFromFn).toHaveBeenCalledWith('etf_cache');
      expect(handler.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'QQQ',
          fund_name: 'Invesco QQQ Trust',
          net_assets: 365600000000,
          net_expense_ratio: 0.002,
          dividend_yield: 0.0048,
          provider: 'alphavantage',
        }),
        { onConflict: 'ticker' }
      );

      // Verify TTL is ~30 days
      const upsertArg = handler.upsert.mock.calls[0][0];
      const expiresAt = new Date(upsertArg.expires_at);
      const cachedAt = new Date(upsertArg.cached_at);
      const diffMs = expiresAt.getTime() - cachedAt.getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(diffMs).toBeCloseTo(thirtyDaysMs, -3); // within a second
    });

    it('should handle upsert error gracefully', async () => {
      const handler = chainTo({ error: { message: 'Upsert failed' } });
      mockFromFn.mockReturnValue(handler);

      // Should not throw
      await expect(service.cacheEtf('QQQ', mockProfile)).resolves.toBeUndefined();
    });
  });

  describe('searchCache', () => {
    it('should search by ticker and fund name', async () => {
      const handler = chainTo({ data: [freshCacheRow], error: null });
      mockFromFn.mockReturnValue(handler);

      const results = await service.searchCache('QQQ');

      expect(mockFromFn).toHaveBeenCalledWith('etf_cache');
      expect(handler.or).toHaveBeenCalledWith(
        expect.stringContaining('ticker.ilike.QQQ%')
      );
      expect(handler.limit).toHaveBeenCalledWith(20);
      expect(results).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      const handler = chainTo({ data: null, error: { message: 'Query error' } });
      mockFromFn.mockReturnValue(handler);

      const results = await service.searchCache('QQQ');

      expect(results).toEqual([]);
    });

    it('should return empty array when no matches', async () => {
      const handler = chainTo({ data: [], error: null });
      mockFromFn.mockReturnValue(handler);

      const results = await service.searchCache('ZZZZZ');

      expect(results).toEqual([]);
    });
  });

  describe('clearExpired', () => {
    it('should delete expired entries', async () => {
      const handler = chainTo({ error: null });
      mockFromFn.mockReturnValue(handler);

      await service.clearExpired();

      expect(mockFromFn).toHaveBeenCalledWith('etf_cache');
      expect(handler.delete).toHaveBeenCalled();
    });
  });

  describe('getUserSavedTickers', () => {
    it('should return saved tickers for a user', async () => {
      const handler = chainTo({
        data: [{ ticker: 'QQQ' }, { ticker: 'SPY' }],
        error: null,
      });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getUserSavedTickers('user@test.com');

      expect(mockFromFn).toHaveBeenCalledWith('user_saved_etfs');
      expect(handler.eq).toHaveBeenCalledWith('user_id', 'user@test.com');
      expect(result).toEqual(['QQQ', 'SPY']);
    });

    it('should return empty array on error', async () => {
      const handler = chainTo({ data: null, error: { message: 'Error' } });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getUserSavedTickers('user@test.com');

      expect(result).toEqual([]);
    });

    it('should return empty array when no saved ETFs', async () => {
      const handler = chainTo({ data: [], error: null });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getUserSavedTickers('user@test.com');

      expect(result).toEqual([]);
    });
  });

  describe('saveEtf', () => {
    it('should upsert a saved ETF', async () => {
      const handler = chainTo({ error: null });
      mockFromFn.mockReturnValue(handler);

      await service.saveEtf('user@test.com', 'qqq', 'My notes');

      expect(mockFromFn).toHaveBeenCalledWith('user_saved_etfs');
      expect(handler.upsert).toHaveBeenCalledWith(
        {
          user_id: 'user@test.com',
          ticker: 'QQQ',
          notes: 'My notes',
        },
        { onConflict: 'user_id,ticker' }
      );
    });

    it('should handle null notes', async () => {
      const handler = chainTo({ error: null });
      mockFromFn.mockReturnValue(handler);

      await service.saveEtf('user@test.com', 'QQQ');

      expect(handler.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
        expect.any(Object)
      );
    });

    it('should handle save error gracefully', async () => {
      const handler = chainTo({ error: { message: 'Duplicate' } });
      mockFromFn.mockReturnValue(handler);

      await expect(service.saveEtf('user@test.com', 'QQQ')).resolves.toBeUndefined();
    });
  });

  describe('unsaveEtf', () => {
    it('should delete a saved ETF', async () => {
      const handler = chainTo({ error: null });
      mockFromFn.mockReturnValue(handler);

      await service.unsaveEtf('user@test.com', 'qqq');

      expect(mockFromFn).toHaveBeenCalledWith('user_saved_etfs');
      expect(handler.delete).toHaveBeenCalled();
    });

    it('should handle unsave error gracefully', async () => {
      const handler = chainTo({ error: { message: 'Not found' } });
      mockFromFn.mockReturnValue(handler);

      await expect(service.unsaveEtf('user@test.com', 'QQQ')).resolves.toBeUndefined();
    });
  });

  describe('getSavedEtfs', () => {
    it('should return merged saved + cache data', async () => {
      const savedRows = [
        { id: '1', user_id: 'user@test.com', ticker: 'QQQ', notes: null, saved_at: '2026-04-01T00:00:00Z' },
      ];

      // First call for user_saved_etfs
      const savedHandler = chainTo({ data: savedRows, error: null });
      // Second call for etf_cache
      const cacheHandler = chainTo({ data: [freshCacheRow], error: null });

      mockFromFn
        .mockReturnValueOnce(savedHandler)
        .mockReturnValueOnce(cacheHandler);

      const result = await service.getSavedEtfs('user@test.com');

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('QQQ');
      expect(result[0].user_id).toBe('user@test.com');
      expect(result[0].fund_name).toBe('Invesco QQQ Trust');
    });

    it('should return empty array when no saved ETFs', async () => {
      const handler = chainTo({ data: [], error: null });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getSavedEtfs('user@test.com');

      expect(result).toEqual([]);
    });

    it('should return empty array on savedRows error', async () => {
      const handler = chainTo({ data: null, error: { message: 'DB error' } });
      mockFromFn.mockReturnValue(handler);

      const result = await service.getSavedEtfs('user@test.com');

      expect(result).toEqual([]);
    });
  });
});
