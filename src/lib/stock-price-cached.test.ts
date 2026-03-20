import { CachedStockService } from './stock-price-cached';
import { sharedStockPriceCache } from './stock-price-cache';
import { alphaVantageStockService } from './stock-price-alphavantage';

// Mock the dependencies
jest.mock('./stock-price-cache', () => ({
  sharedStockPriceCache: {
    getCachedPrice: jest.fn(),
    cachePrice: jest.fn(),
  },
}));

jest.mock('./stock-price-alphavantage', () => ({
  alphaVantageStockService: {
    getStockPrice: jest.fn(),
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
      expect(alphaVantageStockService.getStockPrice).not.toHaveBeenCalled();
    });

    it('should fetch from Alpha Vantage if not in cache', async () => {
      process.env.ALPHA_VANTAGE_KEY = 'test-key';
      const mockPrice = {
        symbol: 'TSLA',
        price: 700.0,
        change: -10.0,
        changePercent: -1.4,
        timestamp: new Date().toISOString(),
      };
      (sharedStockPriceCache.getCachedPrice as jest.Mock).mockResolvedValue(null);
      (alphaVantageStockService.getStockPrice as jest.Mock).mockResolvedValue(mockPrice);

      const result = await cachedStockService.getStockPrice('tsla');

      expect(result).toEqual(mockPrice);
      expect(sharedStockPriceCache.getCachedPrice).toHaveBeenCalledWith('TSLA');
      expect(alphaVantageStockService.getStockPrice).toHaveBeenCalledWith('TSLA');
      expect(sharedStockPriceCache.cachePrice).toHaveBeenCalledWith('TSLA', mockPrice);
    });

    it('should return null if cache miss and Alpha Vantage fails', async () => {
      process.env.ALPHA_VANTAGE_KEY = 'test-key';
      (sharedStockPriceCache.getCachedPrice as jest.Mock).mockResolvedValue(null);
      (alphaVantageStockService.getStockPrice as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await cachedStockService.getStockPrice('MSFT');

      expect(result).toBeNull();
      expect(sharedStockPriceCache.cachePrice).not.toHaveBeenCalled();
    });

    it('should return null if cache miss and ALPHA_VANTAGE_KEY is missing', async () => {
      delete process.env.ALPHA_VANTAGE_KEY;
      (sharedStockPriceCache.getCachedPrice as jest.Mock).mockResolvedValue(null);

      const result = await cachedStockService.getStockPrice('GOOGL');

      expect(result).toBeNull();
      expect(alphaVantageStockService.getStockPrice).not.toHaveBeenCalled();
    });
  });
});
