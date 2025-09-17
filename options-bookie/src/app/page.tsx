'use client';

import { useState, useEffect, useCallback } from 'react';
import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import TransactionTable from '@/components/TransactionTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddTransactionModal from '@/components/AddTransactionModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import DeleteChainModal from '@/components/DeleteChainModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import SummaryView from '@/components/SummaryView';
import PortfolioSelector from '@/components/PortfolioSelector';
import PortfolioModal from '@/components/PortfolioModal';
import { useTransactions } from '@/hooks/useTransactions';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthButton from '@/components/AuthButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteChainModal, setShowDeleteChainModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<OptionsTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<OptionsTransaction | null>(null);
  const [deletingChainId, setDeletingChainId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'summary'>('trades');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [chains, setChains] = useState<TradeChain[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<OptionsTransaction[]>([]);

  // Get unique symbols for stock prices
  const uniqueSymbols = [...new Set(transactions.map(t => t.stockSymbol))];
  const { refreshPrices, loading: pricesLoading } = useStockPrices(uniqueSymbols);

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

  const fetchChains = useCallback(async () => {
    try {
      const url = selectedPortfolioId
        ? `/api/trade-chains?portfolioId=${selectedPortfolioId}`
        : '/api/trade-chains?portfolioId=all';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setChains(data);
      } else {
        console.error('Failed to fetch trade chains');
      }
    } catch (error) {
      console.error('Error fetching trade chains:', error);
    }
  }, [selectedPortfolioId]);

  // Fetch portfolios and chains on component mount
  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  useEffect(() => {
    fetchChains();
  }, [fetchChains]);

  // Auto-update chain statuses based on transaction statuses
  useEffect(() => {
    const updateChainStatuses = async () => {
      if (chains.length === 0 || transactions.length === 0) return;

      console.log('🔍 Checking chain statuses...', {
        chains: chains.length,
        transactions: transactions.length
      });

      const chainsToUpdate = [];

      for (const chain of chains) {
        // Get all transactions for this chain
        const chainTransactions = transactions.filter(t => t.chainId === chain.id);
        const hasOpenTransactions = chainTransactions.some(t => t.status === 'Open');

        console.log(`🔗 Chain ${chain.id} (${chain.symbol}): ${chainTransactions.length} transactions, hasOpen: ${hasOpenTransactions}, currentStatus: ${chain.chainStatus}`,
          chainTransactions.map(t => `${t.stockSymbol}-${t.status}`));

        if (chain.chainStatus === 'Active') {
          // If no open transactions, this chain should be closed
          if (!hasOpenTransactions && chainTransactions.length > 0) {
            console.log(`❌ Chain ${chain.id} (${chain.symbol}) should be closed - no open transactions found`);
            chainsToUpdate.push({ id: chain.id, status: 'Closed' });
          } else if (hasOpenTransactions) {
            console.log(`✅ Chain ${chain.id} (${chain.symbol}) staying active - has open transactions`);
          }
        } else if (chain.chainStatus === 'Closed') {
          // If there are open transactions, this chain should be active
          if (hasOpenTransactions) {
            console.log(`🔄 Chain ${chain.id} (${chain.symbol}) should be active - has open transactions`);
            chainsToUpdate.push({ id: chain.id, status: 'Active' });
          } else {
            console.log(`✅ Chain ${chain.id} (${chain.symbol}) staying closed - no open transactions`);
          }
        }
      }

      // Update chains that need status changes
      for (const chainUpdate of chainsToUpdate) {
        try {
          const chainResponse = await fetch(`/api/trade-chains/${chainUpdate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chainStatus: chainUpdate.status })
          });

          if (chainResponse.ok) {
            console.log(`Successfully updated chain ${chainUpdate.id} to ${chainUpdate.status} status`);
          } else {
            console.error(`Failed to update chain ${chainUpdate.id}:`, await chainResponse.text());
          }
        } catch (error) {
          console.error(`Error updating chain ${chainUpdate.id}:`, error);
        }
      }

      // Refresh chains if any were updated
      if (chainsToUpdate.length > 0) {
        await fetchChains();
      }
    };

    updateChainStatuses();
  }, [chains, transactions, fetchChains]);

  // Auto-update expired trades
  useEffect(() => {
    const checkAndUpdateExpiredTrades = async () => {
      const openTrades = transactions.filter(t => t.status === 'Open');
      const expiredTrades = openTrades.filter(t => {
        const today = new Date();
        const expiryDate = new Date(t.expiryDate);
        return today > expiryDate;
      });

      if (expiredTrades.length > 0) {
        console.log(`Found ${expiredTrades.length} expired trades, updating to Expired status`);

        for (const trade of expiredTrades) {
          try {
            // For expired trades, keep the existing profitLoss value
            // The P&L should already be calculated when the trade was opened
            await updateTransaction(trade.id, {
              status: 'Expired',
              closeDate: new Date()
            });

            // If this trade is part of a chain, update the chain status to 'Closed'
            if (trade.chainId) {
              try {
                const chainResponse = await fetch(`/api/trade-chains/${trade.chainId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chainStatus: 'Closed' })
                });

                if (!chainResponse.ok) {
                  console.error('Failed to update chain status for expired trade');
                }
              } catch (error) {
                console.error('Error updating chain status for expired trade:', error);
              }
            }
          } catch (error) {
            console.error(`Error updating expired trade ${trade.id}:`, error);
          }
        }

        // Refresh transactions and chains to show updated statuses
        await fetchChains();
        refreshTransactions();
      }
    };

    // Check for expired trades only when the app loads
    checkAndUpdateExpiredTrades();
  }, [transactions, updateTransaction, refreshTransactions]);

  const handlePortfolioChange = (portfolioId: string | null) => {
    setSelectedPortfolioId(portfolioId);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status === 'all' ? null : status);
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

      // Refresh chains to ensure unrealized P&L updates correctly
      await fetchChains();

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
      const originalTransaction = transactions.find(t => t.id === id);


      await updateTransaction(id, updates);

      // Check if this transaction is part of a chain and is being closed
      // NOTE: "Rolled" trades don't close the chain since they create new open trades
      if (originalTransaction?.chainId && updates.status && ['Closed', 'Expired', 'Assigned'].includes(updates.status)) {
        // Check if this was the open trade in the chain
        const chainTransactions = transactions.filter(t => t.chainId === originalTransaction.chainId);
        const wasOpenTrade = originalTransaction.status === 'Open';

        if (wasOpenTrade) {
          // Update the chain status to 'Closed' since the open trade is now closed
          console.log(`Updating chain ${originalTransaction.chainId} status to 'Closed' for transaction ${id}`);
          try {
            const chainResponse = await fetch(`/api/trade-chains/${originalTransaction.chainId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chainStatus: 'Closed' })
            });

            if (!chainResponse.ok) {
              console.error('Failed to update chain status:', await chainResponse.text());
            } else {
              console.log('Chain status updated successfully');
            }
          } catch (error) {
            console.error('Error updating chain status:', error);
          }
        }
      }

      setShowEditModal(false);
      setEditingTransaction(null);

      // Refresh chains and transactions if a trade was rolled (chainId was added/reused) or if chain status was updated
      if (updates.chainId || updates.status === 'Rolled' || (originalTransaction?.chainId && updates.status && ['Closed', 'Expired', 'Assigned'].includes(updates.status))) {
        // Refresh transactions FIRST to ensure new open trades are loaded before chain status is evaluated
        await refreshTransactions();
        await fetchChains();
      }
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
    // Find the transaction to get details for confirmation
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Set transaction for deletion and show modal
    setDeletingTransaction(transaction);
    setShowDeleteModal(true);
  };

  const handleDeleteChain = async (chainId: string) => {
    // Find all transactions in the chain
    const chainTransactions = transactions.filter(t => t.chainId === chainId);
    if (chainTransactions.length === 0) return;

    // Set chain for deletion and show modal
    setDeletingChainId(chainId);
    setShowDeleteChainModal(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const confirmDeleteChain = async () => {
    if (!deletingChainId) return;

    // Find all transactions in the chain
    const chainTransactions = transactions.filter(t => t.chainId === deletingChainId);
    if (chainTransactions.length === 0) return;

    try {
      // Delete all transactions in the chain
      await Promise.all(chainTransactions.map(t => deleteTransaction(t.id)));
      console.log(`Deleted chain ${deletingChainId} with ${chainTransactions.length} transactions`);
      setDeletingChainId(null);
    } catch (error) {
      console.error('Failed to delete chain:', error);
      // Error is handled by the hook and displayed in the UI
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingTransaction(null);
  };

  const handleCloseDeleteChainModal = () => {
    setShowDeleteChainModal(false);
    setDeletingChainId(null);
  };


  // P&L for options is premium-based, not stock-price-based
  // Open trades: P&L = premium received/paid
  // Closed trades: P&L = (exit premium - entry premium) × contracts × 100 ± fees

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <img
                  src="/images/OptionBookie1.png"
                  alt="OptionsBookie Logo"
                  className="h-20 w-20 object-contain"
                />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">OptionsBookie</h1>
                  <p className="text-muted-foreground">Track your options trades with precision</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={refreshPrices}
                  variant="outline"
                  disabled={pricesLoading}
                  className="flex items-center space-x-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>{pricesLoading ? 'Refreshing...' : 'Refresh Prices'}</span>
                </Button>
                <ThemeToggle />
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
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('trades')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'trades'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                Options Trades
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
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
            <PortfolioSummary transactions={filteredTransactions} chains={chains} />

            {/* Recent Trades - Full Width */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <CardTitle className="text-xl">Recent Trades</CardTitle>

                    {/* Status Filter */}
                    <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Rolled">Rolled</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground">
                      💡 Click the ✏️ button to edit or close trades
                    </div>
                    <Button variant="default" onClick={() => setShowAddModal(true)}>
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
                  onDeleteChain={handleDeleteChain}
                  onEdit={handleEditTransaction}
                  chains={chains}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={confirmDeleteTransaction}
        transaction={deletingTransaction}
      />

      {/* Delete Chain Modal */}
      <DeleteChainModal
        isOpen={showDeleteChainModal}
        onClose={handleCloseDeleteChainModal}
        onConfirm={confirmDeleteChain}
        chainId={deletingChainId}
        chainTransactions={deletingChainId ? transactions.filter(t => t.chainId === deletingChainId) : []}
        chainInfo={deletingChainId ? chains.find(c => c.id === deletingChainId) : null}
      />

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