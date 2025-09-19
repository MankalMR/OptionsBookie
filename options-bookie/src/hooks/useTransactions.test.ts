// src/hooks/useTransactions.test.ts
/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useTransactions } from './useTransactions';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock console methods to suppress logs during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
  mockFetch.mockClear();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('useTransactions hook', () => {
  const mockTransaction = {
    id: 'test-id',
    stockSymbol: 'AAPL',
    tradeOpenDate: new Date('2025-01-15'),
    expiryDate: new Date('2025-02-21'),
    callOrPut: 'Call' as const,
    buyOrSell: 'Sell' as const,
    stockPriceCurrent: 150.50,
    breakEvenPrice: 145.75,
    strikePrice: 150.00,
    premium: 4.25,
    numberOfContracts: 2,
    fees: 1.32,
    status: 'Open' as const,
    portfolioId: 'portfolio-1',
    createdAt: new Date('2025-01-15T12:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
  };

  const mockTransactionInput = {
    stockSymbol: 'MSFT',
    tradeOpenDate: new Date('2025-02-01'),
    expiryDate: new Date('2025-03-21'),
    callOrPut: 'Put' as const,
    buyOrSell: 'Buy' as const,
    stockPriceCurrent: 380.00,
    breakEvenPrice: 375.50,
    strikePrice: 380.00,
    premium: 4.50,
    numberOfContracts: 1,
    fees: 0.66,
    status: 'Open' as const,
    portfolioId: 'portfolio-2',
  };

  const createMockResponse = (data: any, success = true) => ({
    ok: success,
    json: jest.fn().mockResolvedValue(success ? { success: true, data } : { success: false, error: data }),
  });

  describe('Initial state and loading', () => {
    it('should initialize with correct default state', () => {
      mockFetch.mockResolvedValue(createMockResponse([]) as any);

      const { result } = renderHook(() => useTransactions());

      expect(result.current.transactions).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.addTransaction).toBe('function');
      expect(typeof result.current.updateTransaction).toBe('function');
      expect(typeof result.current.deleteTransaction).toBe('function');
      expect(typeof result.current.refreshTransactions).toBe('function');
    });

    it('should fetch transactions on mount', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockTransaction]) as any);

      const { result } = renderHook(() => useTransactions());

      expect(mockFetch).toHaveBeenCalledWith('/api/transactions');
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toEqual([mockTransaction]);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error on mount', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toEqual([]);
      expect(result.current.error).toBe('Network error while fetching transactions');
      expect(console.error).toHaveBeenCalledWith('Error fetching transactions:', expect.any(Error));
    });

    it('should handle API error response on mount', async () => {
      mockFetch.mockResolvedValue(createMockResponse('Failed to fetch', false) as any);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch');
    });
  });

  describe('addTransaction', () => {
    it('should successfully add a new transaction', async () => {
      // Setup initial state
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse({ ...mockTransactionInput, id: 'new-id' }) as any); // Add transaction

      const { result } = renderHook(() => useTransactions());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toHaveLength(1);

      // Add transaction
      await act(async () => {
        await result.current.addTransaction(mockTransactionInput);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTransactionInput),
      });

      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.transactions[0].id).toBe('new-id');
      expect(result.current.error).toBe(null);
    });

    it('should handle add transaction API error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse('Failed to create', false) as any); // Add transaction error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.addTransaction(mockTransactionInput);
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.transactions).toHaveLength(0);
      expect(result.current.error).toBe('Network error while adding transaction');
    });

    it('should handle add transaction network error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([]) as any) // Initial fetch
        .mockRejectedValueOnce(new Error('Network error')); // Add transaction error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.addTransaction(mockTransactionInput);
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.transactions).toHaveLength(0);
      expect(result.current.error).toBe('Network error while adding transaction');
    });
  });

  describe('updateTransaction', () => {
    it('should successfully update an existing transaction', async () => {
      const updatedTransaction = { ...mockTransaction, premium: 5.25, status: 'Closed' as const };

      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(updatedTransaction) as any); // Update transaction

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = { premium: 5.25, status: 'Closed' as const };

      await act(async () => {
        await result.current.updateTransaction('test-id', updates);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/transactions/test-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(result.current.transactions[0].premium).toBe(5.25);
      expect(result.current.transactions[0].status).toBe('Closed');
      expect(result.current.error).toBe(null);
    });

    it('should handle update transaction API error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse('Failed to update', false) as any); // Update error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.updateTransaction('test-id', { premium: 5.25 });
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.transactions[0].premium).toBe(4.25); // Should remain unchanged
      expect(result.current.error).toBe('Network error while updating transaction');
    });

    it('should handle update transaction network error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockRejectedValueOnce(new Error('Network error')); // Update error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.updateTransaction('test-id', { premium: 5.25 });
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.error).toBe('Network error while updating transaction');
    });
  });

  describe('deleteTransaction', () => {
    it('should successfully delete a transaction', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(null) as any); // Delete transaction

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toHaveLength(1);

      await act(async () => {
        await result.current.deleteTransaction('test-id');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/transactions/test-id', {
        method: 'DELETE',
      });

      expect(result.current.transactions).toHaveLength(0);
      expect(result.current.error).toBe(null);
    });

    it('should handle delete transaction API error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse('Failed to delete', false) as any); // Delete error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.deleteTransaction('test-id');
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.transactions).toHaveLength(1); // Should remain unchanged
      expect(result.current.error).toBe('Network error while deleting transaction');
    });

    it('should handle delete transaction network error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockRejectedValueOnce(new Error('Network error')); // Delete error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.deleteTransaction('test-id');
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
        }
      });

      expect(result.current.error).toBe('Network error while deleting transaction');
    });
  });

  describe('refreshTransactions', () => {
    it('should successfully refresh transactions', async () => {
      const newTransaction = { ...mockTransaction, id: 'new-id', stockSymbol: 'MSFT' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction, newTransaction]) as any); // Refresh

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toHaveLength(1);

      await act(async () => {
        await result.current.refreshTransactions();
      });

      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.error).toBe(null);
    });

    it('should handle refresh error', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockRejectedValueOnce(new Error('Refresh error')); // Refresh error

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshTransactions();
      });

      expect(result.current.error).toBe('Network error while fetching transactions');
    });
  });

  describe('State management', () => {
    it('should clear error when making successful API calls', async () => {
      // Start with an error
      mockFetch
        .mockRejectedValueOnce(new Error('Initial error')) // Initial fetch error
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any); // Successful refresh

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error while fetching transactions');
      });

      // Clear error with successful call
      await act(async () => {
        await result.current.refreshTransactions();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.transactions).toEqual([mockTransaction]);
    });

    it('should maintain loading state during operations', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(slowPromise as any);

      const { result } = renderHook(() => useTransactions());

      expect(result.current.loading).toBe(true);

      // Resolve the promise
      act(() => {
        resolvePromise!(createMockResponse([]));
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should not mutate existing transactions when adding new ones', async () => {
      const transaction1 = { ...mockTransaction, id: 'id-1' };
      const transaction2 = { ...mockTransaction, id: 'id-2', stockSymbol: 'MSFT' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse([transaction1]) as any) // Initial fetch
        .mockResolvedValueOnce(createMockResponse(transaction2) as any); // Add transaction

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalTransaction = result.current.transactions[0];

      await act(async () => {
        await result.current.addTransaction(mockTransactionInput);
      });

      // Original transaction should remain unchanged
      expect(result.current.transactions[1]).toBe(originalTransaction);
      expect(result.current.transactions[0].id).toBe('id-2');
    });

    it('should handle concurrent operations gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse([mockTransaction]) as any) // Initial fetch
        .mockResolvedValue(createMockResponse({ ...mockTransaction, id: 'new-id' }) as any); // All subsequent calls

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start multiple operations concurrently
      const promises = [
        result.current.addTransaction(mockTransactionInput),
        result.current.addTransaction({ ...mockTransactionInput, stockSymbol: 'GOOGL' }),
        result.current.addTransaction({ ...mockTransactionInput, stockSymbol: 'TSLA' }),
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Should handle all operations
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 adds
      expect(result.current.error).toBe(null);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: null }),
      } as any);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.transactions).toEqual(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}), // Missing success/data fields
      } as any);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch transactions');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error while fetching transactions');
    });
  });
});
