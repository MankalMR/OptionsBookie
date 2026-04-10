import { GeminiService } from './gemini-service';
import { GoogleGenAI } from '@google/genai';

// Mock the entire genai module
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('GeminiService', () => {
  const originalEnv = process.env;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    mockGenerateContent = jest.fn();
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('recoverEtfMetadata', () => {
    it('should parse valid json from gemini without markdown', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          fundName: 'Invesco QQQ Trust',
          issuer: 'Invesco',
          assetCategory: 'Equity',
          leveraged: 'NO'
        })
      });

      const result = await GeminiService.recoverEtfMetadata('QQQ');

      expect(result).toEqual({
        fundName: 'Invesco QQQ Trust',
        issuer: 'Invesco',
        assetCategory: 'Equity',
        leveraged: 'NO'
      });
    });

    it('should strip markdown formatting and parse safely', async () => {
      mockGenerateContent.mockResolvedValue({
        text: "```json\n" + JSON.stringify({
          fundName: 'Direxion Daily Semiconductor Bull 3x Shares',
          issuer: 'Direxion',
          assetCategory: 'Equity',
          leveraged: 'YES'
        }) + "\n```"
      });

      const result = await GeminiService.recoverEtfMetadata('SOXL');

      expect(result).toEqual({
        fundName: 'Direxion Daily Semiconductor Bull 3x Shares',
        issuer: 'Direxion',
        assetCategory: 'Equity',
        leveraged: 'YES'
      });
    });

    it('should return null if text is empty', async () => {
      mockGenerateContent.mockResolvedValue({
        text: ''
      });

      const result = await GeminiService.recoverEtfMetadata('QQQ');

      expect(result).toBeNull();
    });

    it('should catch errors and return null', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API failure'));

      const result = await GeminiService.recoverEtfMetadata('QQQ');

      expect(result).toBeNull();
    });
  });

  describe('generateEtfProfile', () => {
    it('should generate a full shadow profile correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          fundName: 'ProShares UltraPro QQQ',
          issuer: 'ProShares',
          netAssets: 20000000000,
          netExpenseRatio: 0.0095,
          dividendYield: 0.005,
          assetCategory: 'Equity',
          leveraged: 'YES',
          topHoldings: [
            { symbol: 'AAPL', description: 'Apple Inc', weight: 0.12 }
          ],
          sectorAllocation: [
            { sector: 'Technology', weight: 0.50 }
          ]
        })
      });

      const result = await GeminiService.generateEtfProfile('TQQQ');

      expect(result).not.toBeNull();
      expect(result!.isAiGenerated).toBe(true);
      expect(result!.leveraged).toBe('YES');
      expect(result!.netAssets).toBe(20000000000);
      expect(result!.fundName).toBe('ProShares UltraPro QQQ');
      expect(result!.topHoldings).toHaveLength(1);
    });

    it('should gracefully handle missing pieces', async () => {
      // Return partial json missing holdings/sectors
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          fundName: 'A Niche ETF',
        })
      });

      const result = await GeminiService.generateEtfProfile('NICHE');

      expect(result).not.toBeNull();
      expect(result!.isAiGenerated).toBe(true);
      expect(result!.topHoldings).toEqual([]);
      expect(result!.sectorAllocation).toEqual([]);
      expect(result!.netAssets).toBeNull();
    });

    it('should return null on API error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('503 Unavailable'));
      const result = await GeminiService.generateEtfProfile('TQQQ');
      expect(result).toBeNull();
    });
  });
});
