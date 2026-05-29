import { CachedStockService } from './stock-price-cached';
import { sharedStockPriceCache } from './stock-price-cache';

// Mock the dependencies
jest.mock('./stock-price-cache', () => ({
  sharedStockPriceCache: {
    getCachedPrice: jest.fn(),
    cachePrice: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('CachedStockService', () => {
  let cachedStockService: CachedStockService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    cachedStockService = new CachedStockService();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStockPrice', () => {
    it('should return null if symbol is empty string', async () => {
      const result = await cachedStockService.getStockPrice('');
      expect(result).toBeNull();
      expect(sharedStockPriceCache.getCachedPrice).not.toHaveBeenCalled();
    });

    it('should return null if symbol is null', async () => {
      const result = await cachedStockService.getStockPrice(null as any);
      expect(result).toBeNull();
      expect(sharedStockPriceCache.getCachedPrice).not.toHaveBeenCalled();
    });

    it('should return null if symbol is undefined', async () => {
      const result = await cachedStockService.getStockPrice(undefined as any);
      expect(result).toBeNull();
      expect(sharedStockPriceCache.getCachedPrice).not.toHaveBeenCalled();
    });

    it('should return cached price if available', async () => {
      const mockPrice = {
        symbol: 'AAPL',
        price: 150.0,
        change: 2.5,
        changePercent: 1.6,
        timestamp: new Date().toISOString(),
      };
      (sharedStockPriceCache.getCachedPrice as jest.Mock).mockResolvedValue(mockPrice);

      const result = await cachedStockService.getStockPrice('aapl');

      expect(result).toEqual(mockPrice);
      expect(sharedStockPriceCache.getCachedPrice).toHaveBeenCalledWith('AAPL');
    });

    it('should return null if not in cache (fallback decoupled)', async () => {
      (sharedStockPriceCache.getCachedPrice as jest.Mock).mockResolvedValue(null);

      const result = await cachedStockService.getStockPrice('tsla');

      expect(result).toBeNull();
      expect(sharedStockPriceCache.getCachedPrice).toHaveBeenCalledWith('TSLA');
    });
  });
});
