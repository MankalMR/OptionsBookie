'use client';

import { useState, useEffect, useCallback } from 'react';
import { OptionsTransaction } from '@/types/options';
import TransactionTable from '@/components/TransactionTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddTransactionModal from '@/components/AddTransactionModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import SummaryView from '@/components/SummaryView';
import { updateTransactionPandL } from '@/utils/optionsCalculations';
import { useTransactions } from '@/hooks/useTransactions';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthButton from '@/components/AuthButton';

export default function Home() {
  const {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
  } = useTransactions();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<OptionsTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'summary'>('trades');

  const handleAddTransaction = async (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addTransaction(transaction);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<OptionsTransaction>) => {
    try {
      await updateTransaction(id, updates);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleEditTransaction = (transaction: OptionsTransaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (id: string, updates: Partial<OptionsTransaction>) => {
    try {
      await updateTransaction(id, updates);
      setShowEditModal(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleUpdatePandL = useCallback(async () => {
    try {
      // Update all open transactions with fresh P&L data
      const openTransactions = transactions.filter(t => t.status === 'Open');
      const updatePromises = openTransactions.map(transaction => {
        const updated = updateTransactionPandL(transaction);
        return updateTransaction(transaction.id, updated);
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to update P&L:', error);
    }
  }, [transactions, updateTransaction]);

  // Auto-update P&L every 5 minutes for open positions
  useEffect(() => {
    const interval = setInterval(() => {
      handleUpdatePandL();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [transactions, handleUpdatePandL]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">OptionsBookie</h1>
                <p className="text-gray-600">Track your options trades with precision</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleUpdatePandL}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Refresh P&L
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Trade
                </button>
                <AuthButton />
              </div>
            </div>
          </div>
        </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={refreshTransactions}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading transactions...</span>
          </div>
        </div>
      )}

      {!loading && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('trades')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'trades'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Options Trades
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Summary & Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'trades' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio Summary */}
            <div className="lg:col-span-1">
              <PortfolioSummary transactions={transactions} />
            </div>

            {/* Transactions Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Trades</h2>
                    <div className="text-sm text-gray-600">
                      💡 Click the ✏️ button to edit or close trades
                    </div>
                  </div>
                </div>
                <TransactionTable
                  transactions={transactions}
                  onUpdate={handleUpdateTransaction}
                  onDelete={handleDeleteTransaction}
                  onEdit={handleEditTransaction}
                />
              </div>
            </div>
          </div>
        ) : (
          <SummaryView transactions={transactions} />
        )}
        </main>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTransaction}
        />
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}