/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useEtfSearch } from './useEtfSearch';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('useEtfSearch', () => {
  const mockResults = [
    { ticker: 'QQQ', fundName: 'Invesco QQQ Trust', isCached: true, isSaved: false },
    { ticker: 'QQQM', fundName: 'Invesco NASDAQ 100 ETF', isCached: true, isSaved: true },
  ];

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useEtfSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not search for empty query', async () => {
    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should not search for whitespace-only query', async () => {
    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('   ');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should fetch search results successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/etfs/search?q=QQQ',
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should URL-encode the query parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('S&P 500');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/etfs/search?q=S%26P%20500',
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limited' }),
    } as Response);

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(result.current.error).toBe('Rate limited');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should handle API error response without message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(result.current.error).toBe('Failed to search ETFs');
  });

  it('should handle fetch network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.results).toEqual([]);
  });

  it('should handle non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('unexpected');

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(result.current.error).toBe('Failed to search ETFs');
  });

  it('should clear results and error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { result } = renderHook(() => useEtfSearch());

    await act(async () => {
      await result.current.search('QQQ');
    });

    expect(result.current.results).toHaveLength(2);

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should set loading to true during fetch', async () => {
    let resolvePromise: (value: Response) => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useEtfSearch());

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.search('QQQ');
    });

    // Loading should be true while fetch is pending
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!({ ok: true, json: async () => [] } as Response);
      await searchPromise!;
    });

    expect(result.current.loading).toBe(false);
  });
});
