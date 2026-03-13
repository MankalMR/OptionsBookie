import { useState, useEffect, useCallback } from 'react';
import { OptionsTransaction } from '@/types/options';

interface UseTransactionsReturn {
  transactions: OptionsTransaction[];
  loading: boolean;
  error: string | null;
  addTransaction: (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<OptionsTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<OptionsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/transactions');
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Network error while fetching transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new transaction
  const addTransaction = useCallback(async (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      const result = await response.json();

      if (result.success) {
        setTransactions(prev => [result.data, ...prev]);
      } else {
        setError(result.error || 'Failed to add transaction');
        throw new Error(result.error || 'Failed to add transaction');
      }
    } catch (err) {
      setError('Network error while adding transaction');
      console.error('Error adding transaction:', err);
      throw err;
    }
  }, []);

  // Update an existing transaction
  const updateTransaction = useCallback(async (id: string, updates: Partial<OptionsTransaction>) => {
    try {
      setError(null);

      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setTransactions(prev =>
          prev.map(t => t.id === id ? result.data : t)
        );
      } else {
        setError(result.error || 'Failed to update transaction');
        throw new Error(result.error || 'Failed to update transaction');
      }
    } catch (err) {
      setError('Network error while updating transaction');
      console.error('Error updating transaction:', err);
      throw err;
    }
  }, []);

  // Delete a transaction
  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      } else {
        setError(result.error || 'Failed to delete transaction');
        throw new Error(result.error || 'Failed to delete transaction');
      }
    } catch (err) {
      setError('Network error while deleting transaction');
      console.error('Error deleting transaction:', err);
      throw err;
    }
  }, []);

  // Refresh transactions
  const refreshTransactions = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  // Load transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
  };
}
