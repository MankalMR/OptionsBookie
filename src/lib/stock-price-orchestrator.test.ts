import { OrchestratorStockService } from './stock-price-orchestrator';
import { StockPriceFactory } from './stock-price-factory';
import { sharedStockPriceCache } from './stock-price-cache';

// Mock dependencies
jest.mock('./stock-price-factory', () => ({
  StockPriceFactory: {
    isProviderAvailable: jest.fn(),
    initialize: jest.fn(),
  },
}));

jest.mock('./stock-price-cache', () => ({
  sharedStockPriceCache: {
    getMultipleCachedPrices: jest.fn(),
    cacheMultiplePrices: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OrchestratorStockService', () => {
  let orchestratorService: OrchestratorStockService;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestratorService = new OrchestratorStockService();
  });

  describe('getMultipleStockPrices', () => {
    it('should return fresh cached data if available', async () => {
      const mockCachedPrice = { symbol: 'AAPL', price: 150, isStale: false };
      (sharedStockPriceCache.getMultipleCachedPrices as jest.Mock).mockResolvedValue({ AAPL: mockCachedPrice });

      const results = await orchestratorService.getMultipleStockPrices(['AAPL'], ['AAPL']);

      expect(results['AAPL']).toEqual(mockCachedPrice);
      expect(StockPriceFactory.isProviderAvailable).not.toHaveBeenCalled();
    });

    it('should fallback to Alpha Vantage if cache is stale', async () => {
      (sharedStockPriceCache.getMultipleCachedPrices as jest.Mock).mockResolvedValue({ AAPL: { symbol: 'AAPL', price: 100, isStale: true } });
      (StockPriceFactory.isProviderAvailable as jest.Mock).mockImplementation(provider => provider === 'alphavantage');

      const mockAvService = { getMultipleStockPrices: jest.fn().mockResolvedValue({ AAPL: { symbol: 'AAPL', price: 155 } }) };
      (StockPriceFactory.initialize as jest.Mock).mockReturnValue(mockAvService);

      const results = await orchestratorService.getMultipleStockPrices(['AAPL'], ['AAPL']);

      expect(mockAvService.getMultipleStockPrices).toHaveBeenCalledWith(['AAPL']);
      expect(results['AAPL']?.price).toBe(155);
      expect(sharedStockPriceCache.cacheMultiplePrices).toHaveBeenCalled();
    });

    it('should fallback to Gemini AI and set isAiGenerated flag (and not cache)', async () => {
      (sharedStockPriceCache.getMultipleCachedPrices as jest.Mock).mockResolvedValue({ AAPL: null });
      (StockPriceFactory.isProviderAvailable as jest.Mock).mockImplementation(provider => provider === 'gemini');

      const mockGeminiService = { getMultipleStockPrices: jest.fn().mockResolvedValue({ AAPL: { symbol: 'AAPL', price: 160 } }) };
      (StockPriceFactory.initialize as jest.Mock).mockReturnValue(mockGeminiService);

      const results = await orchestratorService.getMultipleStockPrices(['AAPL'], ['AAPL']);

      expect(mockGeminiService.getMultipleStockPrices).toHaveBeenCalledWith(['AAPL']);
      expect(results['AAPL']?.price).toBe(160);
      expect(results['AAPL']?.isAiGenerated).toBe(true);
      expect(sharedStockPriceCache.cacheMultiplePrices).not.toHaveBeenCalled();
    });

    it('should fallback to stale cache if all live providers fail', async () => {
      const stalePrice = { symbol: 'AAPL', price: 100, isStale: true };
      (sharedStockPriceCache.getMultipleCachedPrices as jest.Mock).mockResolvedValue({ AAPL: stalePrice });
      (StockPriceFactory.isProviderAvailable as jest.Mock).mockReturnValue(false); // No providers available

      const results = await orchestratorService.getMultipleStockPrices(['AAPL'], ['AAPL']);

      expect(results['AAPL']).toEqual(stalePrice);
    });
  });
});
