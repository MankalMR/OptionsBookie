/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn() as jest.MockedFunction<any>;
const mockEtfCacheService = {
  getSavedEtfs: jest.fn() as jest.MockedFunction<any>,
  saveEtf: jest.fn() as jest.MockedFunction<any>,
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

describe('/api/etfs/saved', () => {
  const mockSession = { user: { email: 'test@example.com', name: 'Test' } };

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { GET } = await import('./route');
      const response = await GET();

      expect(response.status).toBe(401);
    });

    it('should return saved ETFs list', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const now = new Date();
      const futureDate = new Date(now.getTime() + 86400000);

      mockEtfCacheService.getSavedEtfs.mockResolvedValue([
        {
          id: '1',
          user_id: 'test@example.com',
          ticker: 'QQQ',
          notes: null,
          saved_at: '2026-04-01T00:00:00Z',
          fund_name: 'Invesco QQQ',
          net_expense_ratio: 0.002,
          dividend_yield: 0.0048,
          net_assets: 365600000000,
          expires_at: futureDate.toISOString(),
        },
      ]);

      const { GET } = await import('./route');
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual(expect.objectContaining({
        ticker: 'QQQ',
        fundName: 'Invesco QQQ',
        netExpenseRatio: 0.002,
        dividendYield: 0.0048,
        netAssets: 365600000000,
        savedAt: '2026-04-01T00:00:00.000Z',
        notes: null,
        isStale: false,
        topHoldings: [],
        sectorAllocation: [],
        isSaved: true
      }));
    });

    it('should mark stale saved ETFs', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const pastDate = new Date(Date.now() - 86400000);

      mockEtfCacheService.getSavedEtfs.mockResolvedValue([
        {
          id: '1',
          user_id: 'test@example.com',
          ticker: 'QQQ',
          notes: null,
          saved_at: '2026-04-01T00:00:00Z',
          fund_name: 'Invesco QQQ',
          cached_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          expires_at: pastDate.toISOString(), // 1 day ago
        },
      ]);

      const { GET } = await import('./route');
      const response = await GET();

      const data = await response.json();
      expect(data[0].isStale).toBe(true);
    });

    it('should handle missing expires_at gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      mockEtfCacheService.getSavedEtfs.mockResolvedValue([
        {
          id: '1',
          user_id: 'test@example.com',
          ticker: 'QQQ',
          notes: null,
          saved_at: '2026-04-01T00:00:00Z',
          // No cache data joined
        },
      ]);

      const { GET } = await import('./route');
      const response = await GET();

      const data = await response.json();
      expect(data[0].isStale).toBe(false);
      expect(data[0].fundName).toBeNull();
    });

    it('should return empty array when no saved ETFs', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockEtfCacheService.getSavedEtfs.mockResolvedValue([]);

      const { GET } = await import('./route');
      const response = await GET();

      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return 500 on unexpected error', async () => {
      mockGetServerSession.mockRejectedValue(new Error('DB error'));

      const { GET } = await import('./route');
      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/etfs/saved', {
        method: 'POST',
        body: JSON.stringify({ ticker: 'QQQ' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when ticker is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/etfs/saved', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Ticker is required');
    });

    it('should save an ETF successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockEtfCacheService.saveEtf.mockResolvedValue(undefined);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/etfs/saved', {
        method: 'POST',
        body: JSON.stringify({ ticker: 'QQQ', notes: 'Test note' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockEtfCacheService.saveEtf).toHaveBeenCalledWith(
        'test@example.com',
        'QQQ',
        'Test note'
      );
    });

    it('should save without notes', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockEtfCacheService.saveEtf.mockResolvedValue(undefined);

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/etfs/saved', {
        method: 'POST',
        body: JSON.stringify({ ticker: 'SPY' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockEtfCacheService.saveEtf).toHaveBeenCalledWith(
        'test@example.com',
        'SPY',
        undefined
      );
    });

    it('should return 500 on unexpected error', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockEtfCacheService.saveEtf.mockRejectedValue(new Error('Save failed'));

      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost/api/etfs/saved', {
        method: 'POST',
        body: JSON.stringify({ ticker: 'QQQ' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
