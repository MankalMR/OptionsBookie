/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockGetServerSession = jest.fn() as jest.MockedFunction<any>;
const mockEtfCacheService = {
  unsaveEtf: jest.fn() as jest.MockedFunction<any>,
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

describe('DELETE /api/etfs/saved/[ticker]', () => {
  const mockSession = { user: { email: 'test@example.com', name: 'Test' } };

  it('should return 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { DELETE } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/saved/QQQ', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ ticker: 'QQQ' }) });

    expect(response.status).toBe(401);
  });

  it('should unsave an ETF successfully', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.unsaveEtf.mockResolvedValue(undefined);

    const { DELETE } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/saved/QQQ', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ ticker: 'QQQ' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mockEtfCacheService.unsaveEtf).toHaveBeenCalledWith('test@example.com', 'QQQ');
  });

  it('should uppercase the ticker', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.unsaveEtf.mockResolvedValue(undefined);

    const { DELETE } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/saved/qqq', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ ticker: 'qqq' }) });

    expect(mockEtfCacheService.unsaveEtf).toHaveBeenCalledWith('test@example.com', 'QQQ');
  });

  it('should return 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockEtfCacheService.unsaveEtf.mockRejectedValue(new Error('Delete failed'));

    const { DELETE } = await import('./route');
    const request = new NextRequest('http://localhost/api/etfs/saved/QQQ', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ ticker: 'QQQ' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to unsave ETF');
  });
});
