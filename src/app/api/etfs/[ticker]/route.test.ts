/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { etfCacheService } from '@/lib/etf-cache';
import { alphaVantageEtfProvider } from '@/lib/etf-provider-alphavantage';
import { GeminiService } from '@/lib/ai/gemini-service';
import { calculateTopTenConcentration } from '@/lib/etf-utils';
import type { EtfProfile, EtfHolding } from '@/types/etf';

// === Mocks ===
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/etf-cache', () => ({
  etfCacheService: {
    getCachedEtf: jest.fn(),
    cacheEtf: jest.fn(),
    getUserSavedTickers: jest.fn().mockResolvedValue([]),
    recordView: jest.fn(),
  },
}));

jest.mock('@/lib/etf-provider-alphavantage', () => ({
  alphaVantageEtfProvider: {
    getEtfProfile: jest.fn(),
  },
}));

jest.mock('@/lib/gemini-service', () => ({
  GeminiService: {
    recoverEtfMetadata: jest.fn(),
    generateEtfProfile: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockProfile: EtfProfile = {
  ticker: 'QQQ',
  fundName: null, // intentionally null for enrichment test
  issuer: null,
  netAssets: 1000,
  netExpenseRatio: 0.002,
  dividendYield: 0.005,
  dividendFrequency: null,
  exDividendDate: null,
  benchmarkIndex: null,
  assetCategory: null,
  inceptionDate: null,
  portfolioTurnover: null,
  leveraged: null,
  topHoldings: [],
  topTenConcentration: null,
  sectorAllocation: [],
  cachedAt: new Date().toISOString(),
  isStale: false,
  isSaved: false,
};

describe('ETF Ticker Route Handler', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    mockRequest = {
      nextUrl: new URL('http://localhost:3000/api/etfs/QQQ'),
    } as any;
  });

  describe('Intelligence Enrichment Flow', () => {
    it('should call Gemini to recover metadata when fundName is missing from provider', async () => {
      // 1. Not in cache
      (etfCacheService.getCachedEtf as jest.Mock).mockResolvedValue(null);
      // 2. AlphaVantage returns profile WITHOUT fundName
      (alphaVantageEtfProvider.getEtfProfile as jest.Mock).mockResolvedValue({ ...mockProfile });
      // 3. Gemini recovers it
      (GeminiService.recoverEtfMetadata as jest.Mock).mockResolvedValue({
        fundName: 'Invesco QQQ Trust',
        issuer: 'Invesco',
      });

      const params = Promise.resolve({ ticker: 'QQQ' });
      const response = await GET(mockRequest, { params });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(alphaVantageEtfProvider.getEtfProfile).toHaveBeenCalledWith('QQQ');
      expect(GeminiService.recoverEtfMetadata).toHaveBeenCalledWith('QQQ');
      expect(data.fundName).toBe('Invesco QQQ Trust'); // Enriched
      expect(data.issuer).toBe('Invesco'); // Enriched
      
      // Ensure merged profile is cached
      expect(etfCacheService.cacheEtf).toHaveBeenCalledWith(
        'QQQ',
        expect.objectContaining({ fundName: 'Invesco QQQ Trust' })
      );
    });
  });

  describe('Intelligence Shadow Failover Flow', () => {
    it('should call Gemini to generate a full profile when AlphaVantage fails', async () => {
      // 1. Not in cache
      (etfCacheService.getCachedEtf as jest.Mock).mockResolvedValue(null);
      // 2. AlphaVantage returns null (due to rate limit or error)
      (alphaVantageEtfProvider.getEtfProfile as jest.Mock).mockResolvedValue(null);
      // 3. Gemini steps in
      (GeminiService.generateEtfProfile as jest.Mock).mockResolvedValue({
        ...mockProfile,
        fundName: 'AI Generated QQQ',
        isAiGenerated: true, // Marked as AI
      });

      const params = Promise.resolve({ ticker: 'QQQ' });
      const response = await GET(mockRequest, { params });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(alphaVantageEtfProvider.getEtfProfile).toHaveBeenCalledWith('QQQ');
      expect(GeminiService.generateEtfProfile).toHaveBeenCalledWith('QQQ');
      expect(GeminiService.recoverEtfMetadata).not.toHaveBeenCalled();
      
      expect(data.fundName).toBe('AI Generated QQQ');
      expect(data.isAiGenerated).toBe(true);
      
      expect(etfCacheService.cacheEtf).toHaveBeenCalledWith(
        'QQQ',
        expect.objectContaining({ isAiGenerated: true })
      );
    });

    it('should return 404 if both AlphaVantage and Gemini fail', async () => {
      (etfCacheService.getCachedEtf as jest.Mock).mockResolvedValue(null);
      (alphaVantageEtfProvider.getEtfProfile as jest.Mock).mockResolvedValue(null);
      (GeminiService.generateEtfProfile as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ ticker: 'QQQ' });
      const response = await GET(mockRequest, { params });
      
      expect(response.status).toBe(404);
    });
  });
});
