/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useSavedEtfs } from './useSavedEtfs';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

const mockSavedEtfs = [
  {
    ticker: 'QQQ',
    fundName: 'Invesco QQQ Trust',
    netExpenseRatio: 0.002,
    dividendYield: 0.0048,
    netAssets: 365600000000,
    savedAt: '2026-04-01T00:00:00Z',
    notes: null,
    isStale: false,
  },
  {
    ticker: 'SPY',
    fundName: 'SPDR S&P 500',
    netExpenseRatio: 0.00093,
    dividendYield: 0.012,
    netAssets: 500000000000,
    savedAt: '2026-04-02T00:00:00Z',
    notes: 'Core holding',
    isStale: false,
  },
];

describe('useSavedEtfs', () => {
  it('should fetch saved ETFs on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSavedEtfs,
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/etfs/saved');
    expect(result.current.savedEtfs).toEqual(mockSavedEtfs);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.savedEtfs).toEqual([]);
  });

  it('should handle network error on mount', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should save an ETF and refetch the list', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Save call + refetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedEtfs,
      } as Response);

    await act(async () => {
      await result.current.saveEtf('QQQ');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/etfs/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: 'QQQ' }),
    });

    // Should have refetched the list after saving
    await waitFor(() => {
      expect(result.current.savedEtfs).toEqual(mockSavedEtfs);
    });
  });

  it('should handle save error', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Save fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    await act(async () => {
      await result.current.saveEtf('QQQ');
    });

    expect(result.current.error).toBe('Server error');
  });

  it('should unsave an ETF and refetch the list', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSavedEtfs,
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.savedEtfs).toEqual(mockSavedEtfs);
    });

    // Unsave call + refetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockSavedEtfs[1]],
      } as Response);

    await act(async () => {
      await result.current.unsaveEtf('QQQ');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/etfs/saved/QQQ', {
      method: 'DELETE',
    });

    await waitFor(() => {
      expect(result.current.savedEtfs).toEqual([mockSavedEtfs[1]]);
    });
  });

  it('should handle unsave error', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSavedEtfs,
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Unsave fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    } as Response);

    await act(async () => {
      await result.current.unsaveEtf('QQQ');
    });

    expect(result.current.error).toBe('Not found');
  });

  it('should URL-encode ticker in unsave call', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Unsave call + refetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

    await act(async () => {
      await result.current.unsaveEtf('BRK.B');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/etfs/saved/BRK.B', {
      method: 'DELETE',
    });
  });

  it('should support manual fetchSavedEtfs call', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useSavedEtfs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Manual refetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSavedEtfs,
    } as Response);

    await act(async () => {
      await result.current.fetchSavedEtfs();
    });

    expect(result.current.savedEtfs).toEqual(mockSavedEtfs);
  });
});
