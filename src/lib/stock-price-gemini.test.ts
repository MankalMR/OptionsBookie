import { Type } from "@google/genai";

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    ARRAY: 'ARRAY'
  }
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks are set up
import { GeminiStockService } from './stock-price-gemini';

describe('GeminiStockService', () => {
  let service: GeminiStockService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
    service = new GeminiStockService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStockPrice', () => {
    it('should return parsed data with isAiGenerated flag', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ symbol: 'AAPL', price: 150, change: 2, changePercent: 1.3 })
      });

      const result = await service.getStockPrice('AAPL');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.price).toBe(150);
      expect(result?.isAiGenerated).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should return null if API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await service.getStockPrice('AAPL');
      expect(result).toBeNull();
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));
      const result = await service.getStockPrice('AAPL');
      expect(result).toBeNull();
    });
  });

  describe('getMultipleStockPrices', () => {
    it('should return multiple parsed prices', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify([
          { symbol: 'AAPL', price: 150, change: 2, changePercent: 1.3 },
          { symbol: 'TSLA', price: 200, change: -5, changePercent: -2.4 }
        ])
      });

      const results = await service.getMultipleStockPrices(['AAPL', 'TSLA']);

      expect(results['AAPL']?.price).toBe(150);
      expect(results['AAPL']?.isAiGenerated).toBe(true);
      expect(results['TSLA']?.price).toBe(200);
    });
  });
});
