'use client';

import { useState, useEffect, useCallback } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import TransactionTable from '@/components/TransactionTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddTransactionModal from '@/components/AddTransactionModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import SummaryView from '@/components/SummaryView';
import PortfolioSelector from '@/components/PortfolioSelector';
import PortfolioModal from '@/components/PortfolioModal';
import { updateTransactionPandL } from '@/utils/optionsCalculations';
import { useTransactions } from '@/hooks/useTransactions';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthButton from '@/components/AuthButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, RefreshCw } from 'lucide-react';

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
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<OptionsTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'summary'>('trades');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [filteredTransactions, setFilteredTransactions] = useState<OptionsTransaction[]>([]);

  // Filter transactions based on selected portfolio and status
  useEffect(() => {
    let filtered = transactions;

    // Filter by portfolio
    if (selectedPortfolioId) {
      filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(t => t.status === selectedStatus);
    }

    setFilteredTransactions(filtered);
  }, [transactions, selectedPortfolioId, selectedStatus]);

  const fetchPortfolios = useCallback(async () => {
    try {
      setPortfoliosLoading(true);
      const response = await fetch('/api/portfolios');
      if (response.ok) {
        const data = await response.json();
        setPortfolios(data);

        // Set default portfolio if none selected (only on initial load when portfolios array is empty)
        if (!selectedPortfolioId && portfolios.length === 0 && data.length > 0) {
          const defaultPortfolio = data.find((p: Portfolio) => p.isDefault);
          if (defaultPortfolio) {
            setSelectedPortfolioId(defaultPortfolio.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setPortfoliosLoading(false);
    }
  }, [selectedPortfolioId, portfolios.length]);

  // Fetch portfolios on component mount
  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handlePortfolioChange = (portfolioId: string | null) => {
    setSelectedPortfolioId(portfolioId);
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
  };

  const handleAddPortfolio = () => {
    setShowPortfolioModal(true);
  };

  const handlePortfolioCreated = () => {
    fetchPortfolios();
    setShowPortfolioModal(false);
  };

  const handleDeletePortfolio = async (portfolioId: string) => {
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete portfolio');
      }

      // If the deleted portfolio was selected, switch to "All Portfolios"
      if (selectedPortfolioId === portfolioId) {
        setSelectedPortfolioId(null);
      }

      // Refresh the portfolios list
      await fetchPortfolios();
    } catch (error) {
      console.error('Failed to delete portfolio:', error);
      alert(`Failed to delete portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSetDefaultPortfolio = async (portfolioId: string) => {
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setDefault' }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default portfolio');
      }

      // Refresh portfolios to get updated default status
      await fetchPortfolios();
    } catch (error) {
      console.error('Failed to set default portfolio:', error);
      alert(`Failed to set default portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddTransaction = async (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Add the selected portfolio ID to the transaction
      const transactionWithPortfolio = {
        ...transaction,
        portfolioId: selectedPortfolioId || portfolios.find(p => p.isDefault)?.id || '',
      };
      await addTransaction(transactionWithPortfolio);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
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
                <Button
                  onClick={handleUpdatePandL}
                  variant="outline"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh P&L
                </Button>
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
        {/* Portfolio Selector */}
        <div className="mb-6">
          <PortfolioSelector
            portfolios={portfolios}
            selectedPortfolioId={selectedPortfolioId}
            onPortfolioChange={handlePortfolioChange}
            onAddPortfolio={handleAddPortfolio}
            onDeletePortfolio={handleDeletePortfolio}
            onSetDefaultPortfolio={handleSetDefaultPortfolio}
            loading={portfoliosLoading}
          />
        </div>

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
          <div className="space-y-8">
            {/* Portfolio Overview */}
            <PortfolioSummary transactions={filteredTransactions} />

            {/* Recent Trades - Full Width */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <CardTitle className="text-xl">Recent Trades</CardTitle>

                    {/* Status Filter */}
                    <select
                      id="status-filter"
                      value={selectedStatus || ''}
                      onChange={(e) => handleStatusChange(e.target.value || null)}
                      className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                    >
                      <option value="">All Status</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground">
                      💡 Click the ✏️ button to edit or close trades
                    </div>
                    <Button onClick={() => setShowAddModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Trade
                    </Button>
                  </div>
                </div>

                {/* Filter Status Info */}
                <CardDescription>
                  Showing {filteredTransactions.length} trade{filteredTransactions.length !== 1 ? 's' : ''}
                  {selectedPortfolioId && (
                    <span className="ml-1">
                      in {portfolios.find(p => p.id === selectedPortfolioId)?.name || 'selected portfolio'}
                    </span>
                  )}
                  {selectedStatus && (
                    <span className="ml-1">
                      with status &quot;{selectedStatus}&quot;
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionTable
                  transactions={filteredTransactions}
                  onDelete={handleDeleteTransaction}
                  onEdit={handleEditTransaction}
                  portfolios={portfolios}
                  showPortfolioColumn={!selectedPortfolioId}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <SummaryView transactions={filteredTransactions} />
        )}
        </main>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddTransaction}
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
        />
      )}

                  {/* Edit Transaction Modal */}
                  {showEditModal && editingTransaction && (
                    <EditTransactionModal
                      transaction={editingTransaction}
                      onClose={handleCloseEdit}
                      onSave={handleSaveEdit}
                      portfolios={portfolios}
                    />
                  )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <PortfolioModal
          isOpen={showPortfolioModal}
          onClose={() => setShowPortfolioModal(false)}
          onPortfolioCreated={handlePortfolioCreated}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}