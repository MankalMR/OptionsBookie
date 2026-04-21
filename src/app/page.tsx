'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import TransactionTable from '@/components/TransactionTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddTransactionModal from '@/components/AddTransactionModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import DeleteChainModal from '@/components/DeleteChainModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import SummaryView from '@/components/SummaryView';
import CurrentRiskTab from '@/components/analytics/CurrentRiskTab';
import CotAnalysisTab from '@/components/analytics/CotAnalysisTab';
import AnalyzeEtfsTab from '@/components/analytics/AnalyzeEtfsTab';
import { useIsMobile } from '@/hooks/useMediaQuery';
import PortfolioSelector from '@/components/PortfolioSelector';
import PortfolioModal from '@/components/PortfolioModal';
import AppHeader from '@/components/AppHeader';
import { useTransactions } from '@/hooks/useTransactions';
import { parseLocalDate } from '@/utils/dateUtils';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthButton from '@/components/AuthButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';
import StatusMultiSelect from '@/components/StatusMultiSelect';
import ViewToggle from '@/components/ViewToggle';
import SymbolGroupedView from '@/components/SymbolGroupedView';
import StructuredData, { webApplicationSchema, organizationSchema } from '@/components/StructuredData';
import { logger } from "@/lib/logger";

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 mt-4">Loading workspace...</span>
      </div>
    }>
      <TradingDeskContent />
    </Suspense>
  );
}

function TradingDeskContent() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // URL State helpers
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Derived state from URL
  const activeTab = (searchParams?.get('tab') as 'trades' | 'summary' | 'risk') || 'trades';
  const selectedPortfolioId = searchParams?.get('portfolioId') || null;

  const setActiveTab = (tab: 'trades' | 'summary' | 'risk') => {
    updateUrl({ tab });
  };

  const setSelectedPortfolioId = (id: string | null) => {
    updateUrl({ portfolioId: id });
  };
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Open', 'Rolled']);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(true);
  const [chains, setChains] = useState<TradeChain[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<OptionsTransaction[]>([]);
  const [portfolioFilteredTransactions, setPortfolioFilteredTransactions] = useState<OptionsTransaction[]>([]);

  // Get unique symbols for stock prices
  const uniqueSymbols = useMemo(() => [...new Set(transactions.map(t => t.stockSymbol))], [transactions]);
  const activeSymbols = useMemo(() => 
    [...new Set(transactions.filter(t => t.status === 'Open').map(t => t.stockSymbol))], 
    [transactions]
  );
  const { refreshPrices, loading: pricesLoading, stockPrices, isAvailable: pricesAvailable } = useStockPrices(uniqueSymbols, activeSymbols);

  // Filter transactions for Options Trades tab (portfolio + status filters)
  useEffect(() => {
    let filtered = transactions;

    // Filter by portfolio
    if (selectedPortfolioId) {
      filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
    }

    // Filter by statuses (multiple selection)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(t => {
        // Apply normal status filtering first
        const statusMatches = selectedStatuses.includes(t.status);

        // For chained transactions, only exclude closed chains if user hasn't selected 'Closed' status
        if (t.chainId && statusMatches) {
          const chain = chains.find(c => c.id === t.chainId);
          // If chain is closed, only exclude if user hasn't explicitly selected 'Closed' status
          if (chain && chain.chainStatus === 'Closed' && !selectedStatuses.includes('Closed')) {
            return false;
          }
        }

        return statusMatches;
      });
    }

    // Filter by tickers
    if (selectedTickers.length > 0) {
      filtered = filtered.filter(t => selectedTickers.includes(t.stockSymbol));
    }

    setFilteredTransactions(filtered);
  }, [transactions, selectedPortfolioId, selectedStatuses, selectedTickers, chains]);

  // Filter transactions for Summary & Analytics tab (portfolio + concluded transactions only)
  useEffect(() => {
    let filtered = transactions;

    // Filter by portfolio
    if (selectedPortfolioId) {
      filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
    }

    // For analytics, include concluded transactions (Closed, Assigned, Expired)
    // Also include Rolled transactions that are part of closed chains (needed for chain P&L calculations)
    filtered = filtered.filter(t => {
      if (t.status === 'Closed' || t.status === 'Expired' || t.status === 'Assigned') {
        return true;
      }

      // Include rolled transactions that are part of closed chains
      if (t.status === 'Rolled' && t.chainId) {
        const chain = chains.find(c => c.id === t.chainId);
        return chain && chain.chainStatus === 'Closed';
      }

      return false;
    });

    setPortfolioFilteredTransactions(filtered);
  }, [transactions, selectedPortfolioId, chains]);

  // Filter transactions for Portfolio Overview (portfolio only, all statuses)
  const portfolioOverviewTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by portfolio only (no status filtering for overview)
    if (selectedPortfolioId) {
      filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
    }

    return filtered;
  }, [transactions, selectedPortfolioId]);

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
      logger.error({ error }, 'Error fetching portfolios:');
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
        logger.error('Failed to fetch trade chains');
      }
    } catch (error) {
      logger.error({ error }, 'Error fetching trade chains:');
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


      const chainsToUpdate = [];

      // Pre-group transactions by chainId to avoid O(N*M) performance bottleneck
      const txnsByChain = new Map<string, OptionsTransaction[]>();
      for (const t of transactions) {
        if (!t.chainId) continue;
        if (!txnsByChain.has(t.chainId)) {
          txnsByChain.set(t.chainId, []);
        }
        txnsByChain.get(t.chainId)!.push(t);
      }

      for (const chain of chains) {
        // Get all transactions for this chain
        const chainTransactions = txnsByChain.get(chain.id) || [];
        const hasOpenTransactions = chainTransactions.some(t => t.status === 'Open');


        if (chain.chainStatus === 'Active') {
          // If no open transactions, this chain should be closed
          if (!hasOpenTransactions && chainTransactions.length > 0) {
            chainsToUpdate.push({ id: chain.id, status: 'Closed' });
          }
        } else if (chain.chainStatus === 'Closed') {
          // If there are open transactions, this chain should be active
          if (hasOpenTransactions) {
            chainsToUpdate.push({ id: chain.id, status: 'Active' });
          }
        }
      }

      // Update chains that need status changes concurrently
      if (chainsToUpdate.length > 0) {
        await Promise.all(
          chainsToUpdate.map(async (chainUpdate) => {
            try {
              const chainResponse = await fetch(`/api/trade-chains/${chainUpdate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chainStatus: chainUpdate.status })
              });

              if (!chainResponse.ok) {
                logger.error({ data0: await chainResponse.text() }, `Failed to update chain ${chainUpdate.id}:`);
              }
            } catch (error) {
              logger.error({ error }, `Error updating chain ${chainUpdate.id}:`);
            }
          })
        );
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

        // Options expire at market close (4:00 PM ET = 8:00 PM UTC)
        const expiryWithMarketClose = new Date(expiryDate);
        expiryWithMarketClose.setUTCHours(20, 0, 0, 0); // 8:00 PM UTC = 4:00 PM ET

        return today > expiryWithMarketClose;
      });

      if (expiredTrades.length > 0) {

        for (const trade of expiredTrades) {
          try {
            // For expired trades, calculate the final P&L (premium received/paid minus fees)
            // This ensures the P&L reflects the actual outcome of the expired option
            const { calculateProfitLoss } = await import('@/utils/optionsCalculations');
            const finalProfitLoss = calculateProfitLoss(trade); // No exit price = premium received/paid

            await updateTransaction(trade.id, {
              status: 'Expired',
              closeDate: parseLocalDate(trade.expiryDate), // Use expiry date as close date with proper timezone handling
              profitLoss: finalProfitLoss
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
                  logger.error('Failed to update chain status for expired trade');
                }
              } catch (error) {
                logger.error({ error }, 'Error updating chain status for expired trade:');
              }
            }
          } catch (error) {
            logger.error({ error }, `Error updating expired trade ${trade.id}:`);
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

  const handleStatusChange = (statuses: string[]) => {
    setSelectedStatuses(statuses);
  };

  const handleTickerChange = (tickers: string[]) => {
    setSelectedTickers(tickers);
  };

  // Extract unique available tickers based on portfolio and status filtering, but before ticker filtering
  const availableTickers = useMemo(() => {
    let baseTransactions = transactions;
    if (selectedPortfolioId) {
      baseTransactions = baseTransactions.filter(t => t.portfolioId === selectedPortfolioId);
    }

    // Filter by statuses so ticker list only shows tickers with selected statuses
    if (selectedStatuses.length > 0) {
      baseTransactions = baseTransactions.filter(t => {
        const statusMatches = selectedStatuses.includes(t.status);
        if (t.chainId && statusMatches) {
          const chain = chains.find(c => c.id === t.chainId);
          if (chain && chain.chainStatus === 'Closed' && !selectedStatuses.includes('Closed')) {
            return false;
          }
        }
        return statusMatches;
      });
    }

    return [...new Set(baseTransactions.map(t => t.stockSymbol))];
  }, [transactions, selectedPortfolioId, selectedStatuses, chains]);

  const handleTickerClickFromRisk = (ticker: string) => {
    setActiveTab('trades');

    if (!selectedStatuses.includes('Open')) {
      setSelectedStatuses([...selectedStatuses, 'Open']);
    }

    // Set the specific ticker
    setSelectedTickers([ticker]);
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
      logger.error({ error }, 'Failed to delete portfolio:');
      throw error;
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
      logger.error({ error }, 'Failed to set default portfolio:');
      throw error;
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
      logger.error({ error }, 'Failed to add transaction:');
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
          try {
            const chainResponse = await fetch(`/api/trade-chains/${originalTransaction.chainId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chainStatus: 'Closed' })
            });

            if (!chainResponse.ok) {
              logger.error({ data0: await chainResponse.text() }, 'Failed to update chain status:');
            }
          } catch (error) {
            logger.error({ error }, 'Error updating chain status:');
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
      logger.error({ error }, 'Failed to save edit:');
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
      logger.error({ error }, 'Failed to delete transaction:');
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
      setDeletingChainId(null);
    } catch (error) {
      logger.error({ error }, 'Failed to delete chain:');
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
      <StructuredData data={webApplicationSchema} />
      <StructuredData data={organizationSchema} />
      <div className="min-h-screen bg-background">
        <AppHeader />

        {/* Error Display */}
        {error && (
          <div className={`py-4 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
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
          <div className={`py-8 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading transactions...</span>
            </div>
          </div>
        )}

        {!loading && (
          <main className={`py-8 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
            {/* ── Workspace Toolbar ── portfolio selector + tabs + refresh in one band */}
            <div className={`mb-6 border-b border-border ${isMobile ? '' : ''}`}>
              {isMobile ? (
                /* Mobile: stack portfolio row above tabs */
                <div className="space-y-3 pb-3">
                  <PortfolioSelector
                    portfolios={portfolios}
                    selectedPortfolioId={selectedPortfolioId}
                    onPortfolioChange={handlePortfolioChange}
                    onAddPortfolio={handleAddPortfolio}
                    onDeletePortfolio={handleDeletePortfolio}
                    onSetDefaultPortfolio={handleSetDefaultPortfolio}
                    loading={portfoliosLoading}
                  />
                  <nav className="-mb-px flex space-x-4">
                    {(['trades', 'risk', 'summary'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-1 border-b-2 text-xs font-medium transition-colors ${
                          activeTab === tab
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab === 'trades' ? 'Trades' : tab === 'risk' ? 'Risk' : 'History'}
                      </button>
                    ))}
                  </nav>
                </div>
              ) : (
                /* Desktop: single horizontal band */
                <div className="flex items-center justify-between pb-0">
                  {/* Left: portfolio context */}
                  <div className="flex items-center gap-3">
                    <PortfolioSelector
                      portfolios={portfolios}
                      selectedPortfolioId={selectedPortfolioId}
                      onPortfolioChange={handlePortfolioChange}
                      onAddPortfolio={handleAddPortfolio}
                      onDeletePortfolio={handleDeletePortfolio}
                      onSetDefaultPortfolio={handleSetDefaultPortfolio}
                      loading={portfoliosLoading}
                    />
                    <div className="h-5 w-px bg-border" />
                    <button
                      onClick={refreshPrices}
                      disabled={pricesLoading}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                      title="Refresh stock prices"
                    >
                      <svg className={`h-3.5 w-3.5 ${pricesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {pricesLoading ? 'Refreshing…' : 'Refresh Prices'}
                    </button>
                  </div>

                  {/* Right: sub-tabs flush with the border */}
                  <nav className="-mb-px flex space-x-6">
                    <button
                      onClick={() => setActiveTab('trades')}
                      className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === 'trades'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      Options Trades
                    </button>
                    <button
                      onClick={() => setActiveTab('risk')}
                      className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === 'risk'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      Current Risk
                    </button>
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === 'summary'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      History & Analytics
                    </button>
                  </nav>
                </div>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'risk' ? (
              <CurrentRiskTab
                transactions={portfolioOverviewTransactions}
                selectedPortfolioName={selectedPortfolioId ? portfolios.find(p => p.id === selectedPortfolioId)?.name : null}
                onTickerClick={handleTickerClickFromRisk}
              />
            ) : activeTab === 'trades' ? (
              <div className="space-y-8">
                {/* Portfolio Overview */}
                <PortfolioSummary transactions={portfolioOverviewTransactions} chains={chains} />

                {/* Recent Trades - Full Width */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-4 sm:justify-between">
                      <div className="flex items-center space-x-4">
                        <CardTitle className="text-xl whitespace-nowrap">Recent Trades</CardTitle>

                        {/* Mobile-only proximal Add Button */}
                        <Button variant="default" onClick={() => setShowAddModal(true)} size="sm" className="sm:hidden">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Trade
                        </Button>

                        {/* Desktop-only Filters and Toggles (Proximal to Title) */}
                        <div className="hidden sm:flex items-center space-x-4">
                          <StatusMultiSelect
                            selectedStatuses={selectedStatuses}
                            onStatusChange={handleStatusChange}
                            className="w-48"
                          />
                          <ViewToggle
                            viewMode={viewMode}
                            onViewChange={setViewMode}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Desktop Tip Text */}
                        <div className="hidden lg:block text-sm text-muted-foreground mr-2">
                          💡 Click the ✏️ button to edit or close trades
                        </div>

                        {/* Desktop-only anchored Add Button - always align right on sm+ */}
                        <Button variant="default" onClick={() => setShowAddModal(true)} size="sm" className="hidden sm:flex">
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
                      {selectedStatuses.length > 0 && (
                        <span className="ml-1">
                          with status{selectedStatuses.length > 1 ? 'es' : ''}: {selectedStatuses.join(', ')}
                        </span>
                      )}
                      {selectedTickers.length > 0 && (
                        <span className="ml-1">
                          for {selectedTickers.length} ticker{selectedTickers.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {viewMode === 'grouped' ? (
                      <SymbolGroupedView
                        transactions={filteredTransactions}
                        onDelete={handleDeleteTransaction}
                        onDeleteChain={handleDeleteChain}
                        onEdit={handleEditTransaction}
                        chains={chains}
                        portfolios={portfolios}
                        showPortfolioColumn={!selectedPortfolioId}
                        availableTickers={availableTickers}
                        selectedTickers={selectedTickers}
                        onTickerChange={handleTickerChange}
                        stockPrices={stockPrices}
                        pricesAvailable={pricesAvailable}
                        loading={pricesLoading}
                      />
                    ) : (
                      <TransactionTable
                        transactions={filteredTransactions}
                        onDelete={handleDeleteTransaction}
                        onDeleteChain={handleDeleteChain}
                        onEdit={handleEditTransaction}
                        chains={chains}
                        portfolios={portfolios}
                        showPortfolioColumn={!selectedPortfolioId}
                        stockPrices={stockPrices}
                        pricesAvailable={pricesAvailable}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <SummaryView
                transactions={portfolioFilteredTransactions}
                selectedPortfolioName={selectedPortfolioId ? portfolios.find(p => p.id === selectedPortfolioId)?.name : null}
                chains={chains}
                isDemo={false}
              />
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