/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn() as jest.MockedFunction<any>;
const mockEtfCacheService = {
  searchCache: jest.fn() as jest.MockedFunction<any>,
  getUserSavedTickers: jest.fn() as jest.MockedFunction<any>,
  cacheEtf: jest.fn() as jest.MockedFunction<any>,
};
const mockAlphaVantageEtfProvider = {
  getEtfProfile: jest.fn() as jest.MockedFunction<any>,
};

const mockGeminiService = {
  recoverEtfMetadata: jest.fn() as jest.MockedFunction<any>,
  generateEtfProfile: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/etf-cache', () => ({
  etfCacheService: mockEtfCacheService,
}));

jest.mock('@/lib/etf-provider-alphavantage', () => ({
  alphaVantageEtfProvider: mockAlphaVantageEtfProvider,
}));

jest.mock('@/lib/ai/gemini-service', () => ({
  GeminiService: mockGeminiService,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/etfs/search', () => {
  const mockSession = { user: { email: 'test@example.com', name: 'Test' } };

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=QQQ');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when query is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Query parameter q is required');
  });

  it('should return 400 when query is empty', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('should return cached results when available', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.searchCache.mockResolvedValue([
      { ticker: 'QQQ', fund_name: 'Invesco QQQ Trust' },
    ]);
    mockEtfCacheService.getUserSavedTickers.mockResolvedValue(['QQQ']);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=QQQ');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      ticker: 'QQQ',
      fundName: 'Invesco QQQ Trust',
      isCached: true,
      isSaved: true,
    });
    expect(mockAlphaVantageEtfProvider.getEtfProfile).not.toHaveBeenCalled();
  });

  it('should fetch from Alpha Vantage when cache miss', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.searchCache.mockResolvedValue([]);
    mockAlphaVantageEtfProvider.getEtfProfile.mockResolvedValue({
      ticker: 'SPY',
      fundName: null,
    });
    mockGeminiService.recoverEtfMetadata.mockResolvedValue({ fundName: 'SPDR S&P 500 ETF' });
    mockEtfCacheService.cacheEtf.mockResolvedValue(undefined);
    mockEtfCacheService.getUserSavedTickers.mockResolvedValue([]);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=SPY');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].ticker).toBe('SPY');
    expect(data[0].fundName).toBe('SPDR S&P 500 ETF');
    expect(mockEtfCacheService.cacheEtf).toHaveBeenCalled();
  });

  it('should return empty results when cache miss and AV returns null', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.searchCache.mockResolvedValue([]);
    mockAlphaVantageEtfProvider.getEtfProfile.mockResolvedValue(null);
    mockGeminiService.generateEtfProfile.mockResolvedValue(null);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=FAKE');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should uppercase the query', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.searchCache.mockResolvedValue([]);
    mockAlphaVantageEtfProvider.getEtfProfile.mockResolvedValue(null);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=qqq');
    const response = await GET(request);

    expect(mockEtfCacheService.searchCache).toHaveBeenCalledWith('QQQ');
  });

  it('should mark saved ETFs in cache results', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.searchCache.mockResolvedValue([
      { ticker: 'QQQ', fund_name: 'Invesco QQQ' },
      { ticker: 'QQQM', fund_name: 'Invesco NASDAQ 100' },
    ]);
    mockEtfCacheService.getUserSavedTickers.mockResolvedValue(['QQQM']);

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=QQQ');
    const response = await GET(request);

    const data = await response.json();
    expect(data[0].isSaved).toBe(false);
    expect(data[1].isSaved).toBe(true);
  });

  it('should return 500 on unexpected error', async () => {
    mockGetServerSession.mockRejectedValue(new Error('Session error'));

    const { GET } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/search?q=QQQ');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to search ETFs');
  });
});
