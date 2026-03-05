'use client';

/**
 * /demo page
 *
 * Mirrors the main page.tsx dashboard but operates entirely against
 * the in-memory demo store via /api/demo/* endpoints.
 *
 * Key differences from the main page:
 *  - No <ProtectedRoute> wrapper — accessible without login.
 *  - All fetch calls go to /api/demo/* with an x-demo-session-id header.
 *  - No stock price refresh (useStockPrices is not invoked).
 *  - No auto-expire effect (seed data is already well-formed).
 *  - DemoBanner with reset is shown at the top.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import TransactionTable from '@/components/TransactionTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import AddTransactionModal from '@/components/AddTransactionModal';
import EditTransactionModal, { RollTradeData } from '@/components/EditTransactionModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import DeleteChainModal from '@/components/DeleteChainModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import SummaryView from '@/components/SummaryView';
import { useIsMobile } from '@/hooks/useMediaQuery';
import PortfolioSelector from '@/components/PortfolioSelector';
import DemoBanner from '@/components/DemoBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, LogIn } from 'lucide-react';
import StatusMultiSelect from '@/components/StatusMultiSelect';
import ViewToggle from '@/components/ViewToggle';
import SymbolGroupedView from '@/components/SymbolGroupedView';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Helper: all demo fetches include the session header
// ---------------------------------------------------------------------------
function demoHeaders(sessionId: string): Record<string, string> {
    return {
        'x-demo-session-id': sessionId,
        'Content-Type': 'application/json',
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DemoPage() {
    const isMobile = useIsMobile();

    // --- Session bootstrap ---------------------------------------------------
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [demoDisabled, setDemoDisabled] = useState(false);

    useEffect(() => {
        const boot = async () => {
            // Check localStorage for an existing session
            const existing = typeof window !== 'undefined'
                ? localStorage.getItem('demoSessionId')
                : null;

            try {
                const res = await fetch('/api/demo/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: existing }),
                });

                if (res.status === 404) {
                    setDemoDisabled(true);
                    return;
                }

                const data = await res.json();
                if (data.sessionId) {
                    localStorage.setItem('demoSessionId', data.sessionId);
                    setSessionId(data.sessionId);
                }
            } catch (err) {
                console.error('Failed to initialize demo session:', err);
            }
        };

        boot();
    }, []);

    // --- Core state ----------------------------------------------------------
    const [transactions, setTransactions] = useState<OptionsTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [portfoliosLoading, setPortfoliosLoading] = useState(true);
    const [chains, setChains] = useState<TradeChain[]>([]);

    // --- UI state ------------------------------------------------------------
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteChainModal, setShowDeleteChainModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<OptionsTransaction | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<OptionsTransaction | null>(null);
    const [deletingChainId, setDeletingChainId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'trades' | 'summary'>('trades');
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Open', 'Rolled']);

    // --- Filtered views (identical logic to main page) -----------------------
    const [filteredTransactions, setFilteredTransactions] = useState<OptionsTransaction[]>([]);
    const [portfolioFilteredTransactions, setPortfolioFilteredTransactions] = useState<OptionsTransaction[]>([]);

    useEffect(() => {
        let filtered = transactions;
        if (selectedPortfolioId) {
            filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
        }
        if (selectedStatuses.length > 0) {
            filtered = filtered.filter(t => {
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
        setFilteredTransactions(filtered);
    }, [transactions, selectedPortfolioId, selectedStatuses, chains]);

    useEffect(() => {
        let filtered = transactions;
        if (selectedPortfolioId) {
            filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
        }
        filtered = filtered.filter(t => {
            if (t.status === 'Closed' || t.status === 'Expired' || t.status === 'Assigned') return true;
            if (t.status === 'Rolled' && t.chainId) {
                const chain = chains.find(c => c.id === t.chainId);
                return chain && chain.chainStatus === 'Closed';
            }
            return false;
        });
        setPortfolioFilteredTransactions(filtered);
    }, [transactions, selectedPortfolioId, chains]);

    const portfolioOverviewTransactions = useMemo(() => {
        let filtered = transactions;
        if (selectedPortfolioId) {
            filtered = filtered.filter(t => t.portfolioId === selectedPortfolioId);
        }
        return filtered;
    }, [transactions, selectedPortfolioId]);

    // --- Data fetching (demo endpoints) --------------------------------------
    const fetchTransactions = useCallback(async () => {
        if (!sessionId) return;
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/demo/transactions', {
                headers: demoHeaders(sessionId),
            });
            const result = await res.json();
            if (result.success) {
                setTransactions(result.data);
            } else {
                setError(result.error || 'Failed to fetch transactions');
            }
        } catch {
            setError('Network error while fetching demo transactions');
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    const fetchPortfolios = useCallback(async () => {
        if (!sessionId) return;
        try {
            setPortfoliosLoading(true);
            const res = await fetch('/api/demo/portfolios', {
                headers: demoHeaders(sessionId),
            });
            if (res.ok) {
                const data = await res.json();
                setPortfolios(data);
                if (!selectedPortfolioId && data.length > 0) {
                    const defaultPortfolio = data.find((p: Portfolio) => p.isDefault);
                    if (defaultPortfolio) setSelectedPortfolioId(defaultPortfolio.id);
                }
            }
        } catch (err) {
            console.error('Error fetching demo portfolios:', err);
        } finally {
            setPortfoliosLoading(false);
        }
    }, [sessionId, selectedPortfolioId]);

    const fetchChains = useCallback(async () => {
        if (!sessionId) return;
        try {
            const url = selectedPortfolioId
                ? `/api/demo/trade-chains?portfolioId=${selectedPortfolioId}`
                : '/api/demo/trade-chains?portfolioId=all';
            const res = await fetch(url, { headers: demoHeaders(sessionId) });
            if (res.ok) {
                const data = await res.json();
                setChains(data);
            }
        } catch (err) {
            console.error('Error fetching demo trade chains:', err);
        }
    }, [sessionId, selectedPortfolioId]);

    // Kick off data loading once sessionId is available
    useEffect(() => {
        if (!sessionId) return;
        fetchTransactions();
        fetchPortfolios();
        fetchChains();
    }, [sessionId, fetchTransactions, fetchPortfolios, fetchChains]);

    // --- Auto-update chain statuses (same logic as main page, demo endpoints)
    useEffect(() => {
        if (!sessionId || chains.length === 0 || transactions.length === 0) return;

        const updateChainStatuses = async () => {
            const chainsToUpdate: { id: string; status: string }[] = [];
            for (const chain of chains) {
                const chainTxns = transactions.filter(t => t.chainId === chain.id);
                const hasOpen = chainTxns.some(t => t.status === 'Open');
                if (chain.chainStatus === 'Active' && !hasOpen && chainTxns.length > 0) {
                    chainsToUpdate.push({ id: chain.id, status: 'Closed' });
                } else if (chain.chainStatus === 'Closed' && hasOpen) {
                    chainsToUpdate.push({ id: chain.id, status: 'Active' });
                }
            }
            for (const cu of chainsToUpdate) {
                try {
                    await fetch(`/api/demo/trade-chains/${cu.id}`, {
                        method: 'PUT',
                        headers: demoHeaders(sessionId),
                        body: JSON.stringify({ chainStatus: cu.status }),
                    });
                } catch (err) {
                    console.error(`Error updating demo chain ${cu.id}:`, err);
                }
            }
            if (chainsToUpdate.length > 0) await fetchChains();
        };

        updateChainStatuses();
    }, [chains, transactions, fetchChains, sessionId]);

    // --- CRUD handlers -------------------------------------------------------
    const addTransaction = useCallback(async (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!sessionId) return;
        const res = await fetch('/api/demo/transactions', {
            method: 'POST',
            headers: demoHeaders(sessionId),
            body: JSON.stringify(transaction),
        });
        const result = await res.json();
        if (result.success) {
            setTransactions(prev => [result.data, ...prev]);
        } else {
            throw new Error(result.error || 'Failed to add transaction');
        }
    }, [sessionId]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<OptionsTransaction>) => {
        if (!sessionId) return;
        const res = await fetch(`/api/demo/transactions/${id}`, {
            method: 'PUT',
            headers: demoHeaders(sessionId),
            body: JSON.stringify(updates),
        });
        const result = await res.json();
        if (result.success) {
            setTransactions(prev => prev.map(t => t.id === id ? result.data : t));
        } else {
            throw new Error(result.error || 'Failed to update transaction');
        }
    }, [sessionId]);

    const deleteTransaction = useCallback(async (id: string) => {
        if (!sessionId) return;
        const res = await fetch(`/api/demo/transactions/${id}`, {
            method: 'DELETE',
            headers: demoHeaders(sessionId),
        });
        const result = await res.json();
        if (result.success) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        } else {
            throw new Error(result.error || 'Failed to delete transaction');
        }
    }, [sessionId]);

    const refreshTransactions = useCallback(async () => {
        await fetchTransactions();
    }, [fetchTransactions]);

    // --- Handlers (mirror main page) -----------------------------------------
    const handlePortfolioChange = (portfolioId: string | null) => {
        setSelectedPortfolioId(portfolioId);
    };

    const handleStatusChange = (statuses: string[]) => {
        setSelectedStatuses(statuses);
    };

    const handleAddTransaction = async (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const transactionWithPortfolio = {
                ...transaction,
                portfolioId: selectedPortfolioId || portfolios.find(p => p.isDefault)?.id || '',
            };
            await addTransaction(transactionWithPortfolio);
            await fetchChains();
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to add demo transaction:', err);
        }
    };

    const handleEditTransaction = (transaction: OptionsTransaction) => {
        setEditingTransaction(transaction);
        setShowEditModal(true);
    };

    const handleSaveEdit = async (id: string, updates: Partial<OptionsTransaction>) => {
        try {
            const original = transactions.find(t => t.id === id);
            await updateTransaction(id, updates);

            if (original?.chainId && updates.status && ['Closed', 'Expired', 'Assigned'].includes(updates.status)) {
                const wasOpen = original.status === 'Open';
                if (wasOpen && sessionId) {
                    await fetch(`/api/demo/trade-chains/${original.chainId}`, {
                        method: 'PUT',
                        headers: demoHeaders(sessionId),
                        body: JSON.stringify({ chainStatus: 'Closed' }),
                    });
                }
            }

            setShowEditModal(false);
            setEditingTransaction(null);

            if (updates.chainId || updates.status === 'Rolled' || (original?.chainId && updates.status && ['Closed', 'Expired', 'Assigned'].includes(updates.status))) {
                await refreshTransactions();
                await fetchChains();
            }
        } catch (err) {
            console.error('Failed to save demo edit:', err);
        }
    };

    const handleRollTrade = async (rollData: RollTradeData) => {
        if (!sessionId) return;
        try {
            let chainId = rollData.existingChainId;

            // If no existing chain, create a new one in demo store
            if (!chainId) {
                const chainResponse = await fetch('/api/demo/trade-chains', {
                    method: 'POST',
                    headers: demoHeaders(sessionId),
                    body: JSON.stringify(rollData.newChainData)
                });
                if (!chainResponse.ok) throw new Error('Failed to create demo trade chain');
                const chain = await chainResponse.json();
                chainId = chain.id;
            }

            // Apply chain id to both sets of data
            const rolledTradeUpdates = { ...rollData.originalUpdates, chainId: chainId as string };
            const newTradeData = { ...rollData.newTrade, chainId: chainId as string };

            // 1. Update current trade to "Rolled" status
            if (editingTransaction) {
                await updateTransaction(editingTransaction.id, rolledTradeUpdates);
            }

            // 2. Create the new open trade via demo API
            const newTradeResponse = await fetch('/api/demo/transactions', {
                method: 'POST',
                headers: demoHeaders(sessionId),
                body: JSON.stringify(newTradeData)
            });
            if (!newTradeResponse.ok) throw new Error('Failed to create new open trade in demo');

            setShowEditModal(false);
            setEditingTransaction(null);

            await refreshTransactions();
            await fetchChains();
        } catch (err) {
            console.error('Failed to save demo roll:', err);
            throw err; // Re-throw so the modal can alert the failure
        }
    };

    const handleCloseEdit = () => {
        setShowEditModal(false);
        setEditingTransaction(null);
    };

    const handleDeleteTransaction = async (id: string) => {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;
        setDeletingTransaction(transaction);
        setShowDeleteModal(true);
    };

    const handleDeleteChain = async (chainId: string) => {
        const chainTxns = transactions.filter(t => t.chainId === chainId);
        if (chainTxns.length === 0) return;
        setDeletingChainId(chainId);
        setShowDeleteChainModal(true);
    };

    const confirmDeleteTransaction = async () => {
        if (!deletingTransaction) return;
        try {
            await deleteTransaction(deletingTransaction.id);
            setDeletingTransaction(null);
        } catch (err) {
            console.error('Failed to delete demo transaction:', err);
        }
    };

    const confirmDeleteChain = async () => {
        if (!deletingChainId) return;
        const chainTxns = transactions.filter(t => t.chainId === deletingChainId);
        if (chainTxns.length === 0) return;
        try {
            await Promise.all(chainTxns.map(t => deleteTransaction(t.id)));
            setDeletingChainId(null);
        } catch (err) {
            console.error('Failed to delete demo chain:', err);
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

    // --- Reset handler -------------------------------------------------------
    const handleDemoReset = async () => {
        // Setting sessionId to null triggers the initialization useEffect to
        // create a brand-new session with fresh seed data.
        setSessionId(null);
    };

    // --- Demo disabled guard -------------------------------------------------
    if (demoDisabled) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold mb-4">Demo Mode is Disabled</h1>
                    <p className="text-muted-foreground">
                        The demo environment is currently unavailable. Please contact the
                        administrator or visit the main application.
                    </p>
                </div>
            </div>
        );
    }

    // --- Waiting for session to initialize -----------------------------------
    if (!sessionId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-4 text-muted-foreground">Initializing demo session…</p>
                </div>
            </div>
        );
    }

    // --- Render --------------------------------------------------------------
    return (
        <div className="min-h-screen bg-background">
            {/* Demo Banner */}
            <DemoBanner sessionId={sessionId} onReset={handleDemoReset} />

            {/* Header */}
            <header className="bg-card shadow-sm border-b">
                <div className={`${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
                    <div className={`flex justify-between items-center ${isMobile ? 'py-3' : 'py-6'}`}>
                        <div className="flex items-center space-x-2">
                            <img
                                src="/images/OptionBookie1.png"
                                alt="OptionsBookie Logo"
                                className={`object-contain ${isMobile ? 'h-10 w-10' : 'h-20 w-20'}`}
                            />
                            <div>
                                <h1 className={`font-bold ${isMobile ? 'text-lg' : 'text-3xl'}`}>
                                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">OptionsBookie</span>
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                        🧪 Demo
                                    </span>
                                </h1>
                                {!isMobile && <p className="text-muted-foreground">Explore a simulated options portfolio</p>}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <Link href="/auth/signin">
                                <Button variant="default" size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                                    <LogIn className="h-4 w-4 mr-1" />
                                    {isMobile ? 'Sign Up' : 'Try OptionsBookie Free →'}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Error Display */}
            {error && (
                <div className={`py-4 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        <span className="ml-2 text-gray-600">Loading demo portfolio…</span>
                    </div>
                </div>
            )}

            {!loading && (
                <main className={`py-8 ${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
                    {/* Portfolio Selector (read-only for demo — no add/delete/setDefault) */}
                    <div className="mb-6">
                        <PortfolioSelector
                            portfolios={portfolios}
                            selectedPortfolioId={selectedPortfolioId}
                            onPortfolioChange={handlePortfolioChange}
                            onAddPortfolio={() => { }} // no-op in demo
                            onDeletePortfolio={() => { }} // no-op in demo
                            onSetDefaultPortfolio={() => { }} // no-op in demo
                            loading={portfoliosLoading}
                        />
                    </div>

                    {/* Tab Navigation */}
                    <div className="mb-8">
                        <div className="border-b border-border">
                            <nav className={`-mb-px flex ${isMobile ? 'space-x-4' : 'space-x-8'}`}>
                                <button
                                    onClick={() => setActiveTab('trades')}
                                    className={`py-2 px-1 border-b-2 font-medium ${isMobile ? 'text-xs' : 'text-sm'} transition-colors ${activeTab === 'trades'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                        }`}
                                >
                                    Options Trades
                                </button>
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`py-2 px-1 border-b-2 font-medium ${isMobile ? 'text-xs' : 'text-sm'} transition-colors ${activeTab === 'summary'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                                        }`}
                                >
                                    {isMobile ? 'Monthly Summary' : 'Summary & Analytics'}
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'trades' ? (
                        <div className="space-y-8">
                            <PortfolioSummary transactions={portfolioOverviewTransactions} chains={chains} />

                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-4">
                                            <CardTitle className="text-xl">Recent Trades</CardTitle>
                                            {!isMobile && (
                                                <StatusMultiSelect
                                                    selectedStatuses={selectedStatuses}
                                                    onStatusChange={handleStatusChange}
                                                    className="w-48"
                                                />
                                            )}
                                            {!isMobile && (
                                                <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            {!isMobile && (
                                                <div className="text-sm text-muted-foreground">
                                                    💡 Click the ✏️ button to edit or close trades
                                                </div>
                                            )}
                                            <Button variant="default" onClick={() => setShowAddModal(true)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                {isMobile ? 'Add' : 'Add Trade'}
                                            </Button>
                                        </div>
                                    </div>
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
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {viewMode === 'grouped' ? (
                                        <SymbolGroupedView
                                            transactions={filteredTransactions}
                                            onDelete={handleDeleteTransaction}
                                            onDeleteChain={handleDeleteChain}
                                            onEdit={handleEditTransaction}
                                            chains={chains}
                                            portfolios={portfolios}
                                            showPortfolioColumn={!selectedPortfolioId}
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
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <SummaryView
                            transactions={portfolioFilteredTransactions}
                            selectedPortfolioName={
                                selectedPortfolioId ? portfolios.find(p => p.id === selectedPortfolioId)?.name : null
                            }
                            chains={chains}
                        />
                    )}
                </main>
            )}

            {/* Modals */}
            {showAddModal && (
                <AddTransactionModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddTransaction}
                    portfolios={portfolios}
                    selectedPortfolioId={selectedPortfolioId}
                />
            )}

            {showEditModal && editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    onClose={handleCloseEdit}
                    onSave={handleSaveEdit}
                    portfolios={portfolios}
                    onRollTrade={handleRollTrade}
                />
            )}

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleCloseDeleteModal}
                onConfirm={confirmDeleteTransaction}
                transaction={deletingTransaction}
            />

            <DeleteChainModal
                isOpen={showDeleteChainModal}
                onClose={handleCloseDeleteChainModal}
                onConfirm={confirmDeleteChain}
                chainId={deletingChainId}
                chainTransactions={deletingChainId ? transactions.filter(t => t.chainId === deletingChainId) : []}
                chainInfo={deletingChainId ? chains.find(c => c.id === deletingChainId) : null}
            />
        </div>
    );
}
