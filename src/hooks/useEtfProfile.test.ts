/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useEtfProfile } from './useEtfProfile';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

const mockProfile = {
  ticker: 'QQQ',
  fundName: 'Invesco QQQ Trust',
  issuer: null,
  netAssets: 365600000000,
  netExpenseRatio: 0.002,
  dividendYield: 0.0048,
  dividendFrequency: null,
  exDividendDate: null,
  benchmarkIndex: null,
  assetCategory: null,
  inceptionDate: '1999-03-10',
  portfolioTurnover: 0.08,
  leveraged: 'NO',
  topHoldings: [
    { symbol: 'NVDA', description: 'NVIDIA CORP', weight: 0.0943 },
  ],
  topTenConcentration: 0.561,
  sectorAllocation: [
    { sector: 'Information Technology', weight: 0.517 },
  ],
  cachedAt: '2026-04-07T00:00:00Z',
  isStale: false,
  isSaved: false,
};

describe('useEtfProfile', () => {
  it('should initialize with null profile when ticker is null', () => {
    const { result } = renderHook(() => useEtfProfile(null));

    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch profile when ticker is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    const { result } = renderHook(() => useEtfProfile('QQQ'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/etfs/QQQ');
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBeNull();
  });

  it('should URL-encode the ticker', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    renderHook(() => useEtfProfile('BRK.B'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/etfs/BRK.B');
    });
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'ETF profile not found for XYZ' }),
    } as Response);

    const { result } = renderHook(() => useEtfProfile('XYZ'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('ETF profile not found for XYZ');
    expect(result.current.profile).toBeNull();
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useEtfProfile('QQQ'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.profile).toBeNull();
  });

  it('should handle non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('something weird');

    const { result } = renderHook(() => useEtfProfile('QQQ'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch ETF profile');
  });

  it('should reset profile and error when ticker changes to null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    const { result, rerender } = renderHook(
      ({ ticker }) => useEtfProfile(ticker),
      { initialProps: { ticker: 'QQQ' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });

    rerender({ ticker: null });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should refetch when ticker changes', async () => {
    const mockProfile2 = { ...mockProfile, ticker: 'SPY', fundName: 'SPDR S&P 500' };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile2,
      } as Response);

    const { result, rerender } = renderHook(
      ({ ticker }) => useEtfProfile(ticker),
      { initialProps: { ticker: 'QQQ' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.profile?.ticker).toBe('QQQ');
    });

    rerender({ ticker: 'SPY' });

    await waitFor(() => {
      expect(result.current.profile?.ticker).toBe('SPY');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should support manual refresh', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProfile, isStale: false }),
      } as Response);

    const { result } = renderHook(() => useEtfProfile('QQQ'));

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('refresh should do nothing when ticker is null', () => {
    const { result } = renderHook(() => useEtfProfile(null));

    act(() => {
      result.current.refresh();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
