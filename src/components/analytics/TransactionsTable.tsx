import React, { useMemo, useState } from 'react';
import { OptionsTransaction, TradeChain, AIFilterSchema } from '@/types/options';
import { calculateRoR, calculateDaysHeld, calculateCollateral, formatPnLCurrency, getRealizedTransactions, calculateStrategyPerformance, calculatePortfolioRoR, calculateAnnualizedRoR, calculateMonthlyPortfolioAnnualizedRoR, getRoRColorClasses, calculateChainPnL, calculateChainAwareStockPerformance } from '@/utils/optionsCalculations';
import { applyAiFilter } from '@/utils/aiFilter';
import RoRDisplay from '@/components/ui/RoRDisplay';
import { parseLocalDate } from '@/utils/dateUtils';
import { formatStrikePrice } from '@/utils/formatUtils';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Link, Sparkles, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TransactionsTableProps {
  transactions: OptionsTransaction[];
  chains?: TradeChain[];
  monthName?: string;
  selectedPortfolioName?: string | null;
}

export default function TransactionsTable({ transactions, chains = [] }: TransactionsTableProps) {
  const isMobile = useIsMobile();

  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFilters, setAiFilters] = useState<AIFilterSchema | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse query');
      }

      const data = await res.json();
      setAiFilters(data.filter);
      setAiQuery('');
    } catch {
      setAiError('Failed to parse AI filter query. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const clearAiFilters = () => {
    setAiFilters(null);
    setAiError(null);
    setAiQuery('');
  };

  // Helper function to get chain-aware P&L for display
  const getDisplayPnL = (transaction: OptionsTransaction): number => {
    // For chained transactions, show the full chain P&L on the final transaction
    if (transaction.chainId) {
      const chain = chains.find((c: TradeChain) => c.id === transaction.chainId);
      if (chain && chain.chainStatus === 'Closed') {
        return calculateChainPnL(transaction.chainId, transactions);
      }
    }

    // For non-chained transactions, show individual P&L
    return transaction.profitLoss || 0;
  };

  // ⚡ Bolt Performance Optimization:
  // Memoize heavy aggregations and data transformations to prevent O(N) recalculations on every render.
  // Expected impact: significantly smoother UI interactions and faster rendering of the Transactions Table,
  // especially with large portfolios and active trading histories.

  // Filter out rolled transactions for cleaner display
  const displayTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.status !== 'Rolled');

    if (aiFilters) {
      filtered = applyAiFilter(filtered, aiFilters, getDisplayPnL);
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, aiFilters, chains]); // included chains because getDisplayPnL uses it

  // Helper function to check if transaction is part of a closed chain
  const isClosedChainTransaction = (transaction: OptionsTransaction): boolean => {
    if (transaction.chainId) {
      const chain = chains.find((c: TradeChain) => c.id === transaction.chainId);
      return Boolean(chain && chain.chainStatus === 'Closed');
    }
    return false;
  };

  // Calculate month-specific metrics for Quick Stats
  const realizedTransactions = useMemo(() => getRealizedTransactions(transactions, chains), [transactions, chains]);
  const totalPnL = useMemo(() => realizedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0), [realizedTransactions]);
  const winningTrades = useMemo(() => realizedTransactions.filter(t => (t.profitLoss || 0) > 0), [realizedTransactions]);
  const winRate = useMemo(() => realizedTransactions.length > 0 ? (winningTrades.length / realizedTransactions.length) * 100 : 0, [realizedTransactions, winningTrades]);

  // Calculate month-specific strategy performance
  const monthStrategyPerformance = useMemo(() => calculateStrategyPerformance(transactions, chains), [transactions, chains]);

  // Calculate best stock by P&L and RoR for this month using chain-aware logic
  const stockPerformance = useMemo(() => calculateChainAwareStockPerformance(transactions, chains), [transactions, chains]);

  const bestStockByPnL = useMemo(() => Array.from(stockPerformance.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0], [stockPerformance]);

  const bestStockByRoR = useMemo(() => Array.from(stockPerformance.entries())
    .map(([ticker, data]) => ({
      ticker,
      ror: data.totalCollateral > 0 ? (data.pnl / data.totalCollateral * 100) : 0
    }))
    .sort((a, b) => b.ror - a.ror)[0], [stockPerformance]);

  const quickStatsData = useMemo(() => ({
    totalPnL,
    totalTrades: realizedTransactions.length,
    winRate,
    avgRoR: calculatePortfolioRoR(transactions),
    bestStrategy: monthStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: monthStrategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: monthStrategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStockByPnL ? { ticker: bestStockByPnL[0], pnl: bestStockByPnL[1].pnl } : null,
    bestStockByRoR: bestStockByRoR ? { ticker: bestStockByRoR.ticker, ror: bestStockByRoR.ror } : null
  }), [totalPnL, realizedTransactions.length, winRate, monthStrategyPerformance, bestStockByPnL, bestStockByRoR, transactions]);

  // Sort display transactions by close date (most recent first)
  const sortedTransactions = useMemo(() => [...displayTransactions].sort((a, b) => {
    const dateA = parseLocalDate(a.closeDate!).getTime();
    const dateB = parseLocalDate(b.closeDate!).getTime();
    return dateB - dateA;
  }), [displayTransactions]);

  // Mobile view metrics
  const totalCollateral = useMemo(() => transactions.reduce((sum, t) => sum + calculateCollateral(t), 0), [transactions]);
  const averageDays = useMemo(() => transactions.length > 0 ? transactions.reduce((sum, t) =>
    sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0
  ) / transactions.length : 0, [transactions]);
  const portfolioAnnualizedRoR = useMemo(() => calculateMonthlyPortfolioAnnualizedRoR(transactions), [transactions]);

  return (
    <div className="bg-muted/30 px-4 py-3 space-y-6">
      {/* AI Filter Section */}
      <div className="space-y-4">
        <form onSubmit={handleAiFilter} className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              type="text"
              placeholder="Ask AI to filter... (e.g., 'Show me all losing AAPL puts this year')"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              disabled={isAiLoading}
              className="pl-9 bg-background"
            />
          </div>
          <Button type="submit" disabled={isAiLoading || !aiQuery.trim()} className="shrink-0 gap-2">
            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Filter
          </Button>
        </form>

        {aiError && (
          <div className="text-sm text-destructive">{aiError}</div>
        )}

        {aiFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Filters:
            </span>
            {Object.entries(aiFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <Badge key={key} variant="secondary" className="gap-1 px-2 py-0.5 capitalize">
                  {key}: {value}
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAiFilters}
              className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* Individual Trades Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Symbol (Contracts)</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Strike & Type</th>
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Opened</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Closed</th>}
              {!isMobile && <th className="text-center py-2 px-3 font-medium text-muted-foreground">Days Held</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>}
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                <div className="flex flex-col">
                  <span>P&L / Capital</span>
                  <span className="text-xs">RoR / Ann. RoR</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction) => {
              const ror = calculateRoR(transaction);
              const annualizedRoR = calculateAnnualizedRoR(transaction);
              const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate!);
              const pnl = getDisplayPnL(transaction);

              return (
                <tr key={transaction.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium text-card-foreground">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        {isClosedChainTransaction(transaction) && (
                          <Link className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="truncate">{transaction.stockSymbol} ({transaction.numberOfContracts})</span>
                      </div>
                      <Badge
                        variant={transaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                        className={`text-xs px-1 py-0 w-fit text-xs ${transaction.buyOrSell === 'Buy'
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                          : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50'
                        }`}
                      >
                        {transaction.buyOrSell}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">${formatStrikePrice(transaction.strikePrice)}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                          ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                        }`}
                      >
                        {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                      </span>
                    </div>
                  </td>
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground truncate">
                      {parseLocalDate(transaction.tradeOpenDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground truncate">
                      {parseLocalDate(transaction.closeDate!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 text-center text-muted-foreground">
                      {daysHeld}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 truncate">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium truncate ${
                        transaction.status === 'Closed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                          : transaction.status === 'Expired'
                          ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                          : 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-medium">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs">
                        <span className={`${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatPnLCurrency(pnl)}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-600 dark:text-red-400">
                          {formatPnLCurrency(calculateCollateral(transaction))}
                        </span>
                      </span>
                      <span className="text-xs">
                        <span className={`${getRoRColorClasses(ror, annualizedRoR)}`}>
                          {isFinite(ror) ? `${Math.round(ror)}%` : '-'}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span className={`${getRoRColorClasses(ror, annualizedRoR)}`}>
                          {isFinite(annualizedRoR) ? `${Math.round(annualizedRoR)}%` : '-'}
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Summary Card - Only show on mobile */}
      {isMobile && (
        <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-700/50 p-4 mt-4">
          {/* Mobile: Vertical layout with sections */}
          <div className="space-y-4">
            {/* Basic Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-base font-medium text-card-foreground">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-card-foreground">{Math.round(winRate)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex flex-col">
                  <span className={`text-base font-bold ${
                    totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  } leading-tight`}>
                    {formatPnLCurrency(totalPnL)}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Total P&L
                  </div>
                </div>
              </div>
              <div className="text-center">
                <RoRDisplay
                  ror={totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0}
                  annualizedRoR={portfolioAnnualizedRoR}
                  size="base"
                  showLabel={true}
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">
                  {Math.round(averageDays)} days
                </p>
                <p className="text-xs text-muted-foreground">Avg Days</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">
                  {formatPnLCurrency(totalCollateral)}
                </p>
                <p className="text-xs text-muted-foreground">Capital</p>
              </div>
            </div>

            {/* Best Performance */}
            {(quickStatsData.bestStrategy || quickStatsData.bestStockByPnL) && (
              <div className="border-t pt-4 space-y-2">
                {quickStatsData.bestStrategy && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Best Strategy</p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {quickStatsData.bestStrategy.name} ({quickStatsData.bestStrategy.ror.toFixed(1)}%)
                    </p>
                  </div>
                )}
                {quickStatsData.bestStockByPnL && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Top Stock</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {quickStatsData.bestStockByPnL.ticker} ({formatPnLCurrency(quickStatsData.bestStockByPnL.pnl)})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
