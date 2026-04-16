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

  describe('Portfolio Summary', () => {
    const sampleMetrics = {
      totalPnL: 1540.50,
      winRate: 72.5,
      topSymbols: ['TSLA', 'AAPL'],
      totalRoC: 12.4,
      timeframe: 'Yearly'
    };

    it('should generate a live narrative summary via Gemini', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Your portfolio is performing strongly with a 72.5% win rate.'
      });

      const result = await GeminiService.generatePortfolioSummary({
        ...sampleMetrics,
        isDemo: false
      });

      expect(result).toBe('Your portfolio is performing strongly with a 72.5% win rate.');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should generate a mocked summary in demo mode (positive PnL)', async () => {
      const result = await GeminiService.generatePortfolioSummary({
        ...sampleMetrics,
        isDemo: true
      });

      expect(result).toContain('performing well');
      expect(result).toContain('72.5%');
      expect(result).toContain('$1540.50');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should generate a mocked summary in demo mode (negative PnL)', async () => {
      const result = await GeminiService.generatePortfolioSummary({
        ...sampleMetrics,
        totalPnL: -500,
        isDemo: true
      });

      expect(result).toContain('faced some headwinds');
      expect(result).toContain('$-500');
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Quota exceeded'));
      
      await expect(GeminiService.generatePortfolioSummary({
        ...sampleMetrics,
        isDemo: false
      })).rejects.toThrow();
    });
  });

  describe('Query Parsing', () => {
    it('should parse natural language into filters via Gemini', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ symbol: 'TSLA', type: 'Put', outcome: 'win' })
      });

      const result = await GeminiService.parsePortfolioQuery('Winning TSLA puts');

      expect(result).toEqual({ symbol: 'TSLA', type: 'Put', outcome: 'win' });
    });

    it('should handle demo mode heuristics correctly', async () => {
      const result = await GeminiService.parsePortfolioQuery('Show me AAPL calls', true);

      expect(result).toEqual({ symbol: 'AAPL', type: 'Call' });
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should strip markdown and parse JSON safely', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '```json\n{"symbol": "MSFT"}\n```'
      });

      const result = await GeminiService.parsePortfolioQuery('Microsoft trades');

      expect(result).toEqual({ symbol: 'MSFT' });
    });

    it('should return empty filters in demo mode if no patterns match', async () => {
      const result = await GeminiService.parsePortfolioQuery('nothing specific', true);
      expect(result).toEqual({});
    });
  });

  describe('ETF Metadata Recovery', () => {
    it('should parse valid json from gemini', async () => {
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

    it('should return null if text is empty', async () => {
      mockGenerateContent.mockResolvedValue({ text: '' });
      const result = await GeminiService.recoverEtfMetadata('QQQ');
      expect(result).toBeNull();
    });
  });

  describe('ETF Profile Generation (Shadow Flow)', () => {
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
          topHoldings: [{ symbol: 'AAPL', description: 'Apple Inc', weight: 0.12 }],
          sectorAllocation: [{ sector: 'Technology', weight: 0.50 }]
        })
      });

      const result = await GeminiService.generateEtfProfile('TQQQ');

      expect(result).not.toBeNull();
      expect(result!.isAiGenerated).toBe(true);
      expect(result!.leveraged).toBe('YES');
      expect(result!.fundName).toBe('ProShares UltraPro QQQ');
    });

    it('should handle API error gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('503 Unavailable'));
      const result = await GeminiService.generateEtfProfile('TQQQ');
      expect(result).toBeNull();
    });
  });

  describe('ETF Holdings Enrichment', () => {
    it('should fill in missing n/a symbols', async () => {
      const incomplete = [
        { symbol: 'n/a', description: 'CAMECO CORP', weight: 0.23 },
        { symbol: 'n/a', description: 'NEXGEN ENERGY LTD', weight: 0.06 },
        { symbol: 'OKLO', description: 'OKLO INC', weight: 0.06 }
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify([
          { symbol: 'CCJ', description: 'CAMECO CORP', weight: 0.23 },
          { symbol: 'NXE', description: 'NEXGEN ENERGY LTD', weight: 0.06 },
          { symbol: 'OKLO', description: 'OKLO INC', weight: 0.06 }
        ])
      });

      const result = await GeminiService.enrichEtfHoldings('URA', incomplete as any);

      expect(result[0].symbol).toBe('CCJ');
      expect(result[1].symbol).toBe('NXE');
      expect(result[2].symbol).toBe('OKLO');
    });

    it('should return original list if AI failure occurs', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI Failure'));
      const list = [{ symbol: 'n/a', description: 'LOST CORP', weight: 0.1 }];
      
      const result = await GeminiService.enrichEtfHoldings('TEST', list as any);
      expect(result).toEqual(list);
    });
  });
});
