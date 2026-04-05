'use client';

import React, { useMemo, useState } from 'react';
import { OptionsTransaction, TradeChain } from '@/types/options';
import {
  calculateDaysHeld,
  getRealizedTransactions,
  calculateTotalRealizedPnL,
  calculateStrategyPerformance,
  calculateMonthlyTopTickers,
  calculatePortfolioRoR,
  calculateMonthlyAnnualizedRoR,
  calculateCollateral,
  calculateYearlyAnnualizedRoRWithActiveMonths,
  calculateChainAwareMonthlyPnL,
  calculateChainPnL,
  calculateChainAwareStockPerformance,
  getEffectiveCloseDate,
  calculateSmartCapital,
  calculateSmartPortfolioRoR
} from '@/utils/optionsCalculations';
import { parseLocalDate } from '@/utils/dateUtils';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Sparkles } from 'lucide-react';

// Import our new modular components
import QuickStatsCard from './analytics/QuickStatsCard';
import StrategyPerformanceCard from './analytics/StrategyPerformanceCard';
import YearlyPerformanceCard from './analytics/YearlyPerformanceCard';
import AllTimePortfolioAnalytics from './analytics/AllTimePortfolioAnalytics';
import BenchmarkComparisonChart from './analytics/BenchmarkComparisonChart';

interface SummaryViewProps {
  transactions: OptionsTransaction[];
  selectedPortfolioName?: string | null;
  chains?: TradeChain[];
  isDemo?: boolean;
}

interface MonthlySummary {
  month: number;
  monthName: string;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  fees: number;
}

export interface YearlySummary {
  year: number;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalFees: number;
  averageDaysHeld: number;
  bestMonth: { month: string; pnl: number; ror: number; preciseRoR: number; annualizedRoR: number; preciseAnnualizedRoR: number; capitalDeployed: number; trades: number };
  worstMonth: { month: string; pnl: number; ror: number; preciseRoR: number; annualizedRoR: number; preciseAnnualizedRoR: number; capitalDeployed: number; trades: number };
  monthlyBreakdown: MonthlySummary[];
}

export default function SummaryView({
  transactions: initialTransactions,
  selectedPortfolioName,
  chains = [],
  isDemo = false
}: SummaryViewProps) {
  const isMobile = useIsMobile();

  // AI Filter State
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAiFilters, setActiveAiFilters] = useState<{ symbol?: string; type?: string; outcome?: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, isDemo }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse query');
      }

      // Handle the fact that the API might return the filter object directly or wrapped in `{ filter: ... }`
      // Our API route returns it directly via `NextResponse.json(filters)`
      setActiveAiFilters(data.filter || data);
    } catch (err) {
      console.error('Error in AI search:', err);
      setAiError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAiLoading(false);
    }
  };

  const clearAiFilters = () => {
    setActiveAiFilters(null);
    setAiQuery('');
    setAiError(null);
  };

  const transactions = useMemo(() => {
    let filtered = initialTransactions;
    if (activeAiFilters) {
      filtered = filtered.filter(t => {
        if (activeAiFilters.symbol && t.stockSymbol.toUpperCase() !== activeAiFilters.symbol.toUpperCase()) return false;
        if (activeAiFilters.type && t.callOrPut.toLowerCase() !== activeAiFilters.type.toLowerCase()) return false;

        if (activeAiFilters.outcome) {
          const pnl = t.profitLoss || 0;
          if (activeAiFilters.outcome === 'win' && pnl <= 0) return false;
          if (activeAiFilters.outcome === 'loss' && pnl >= 0) return false;
        }
        return true;
      });
    }
    return filtered;
  }, [initialTransactions, activeAiFilters]);

  // Memoize all realized transactions so we don't recalculate them repeatedly
  const allRealizedTransactions = useMemo(() => getRealizedTransactions(transactions, chains), [transactions, chains]);

  const yearlySummaries = useMemo(() => {
    const completedTransactions = allRealizedTransactions.filter(t =>
      t.closeDate || t.status === 'Assigned' || t.status === 'Expired'
    );


    const yearlyData: Record<number, YearlySummary> = {};

    // Initialize yearly data structures based on effective close dates
    completedTransactions.forEach(transaction => {
      const effectiveCloseDate = getEffectiveCloseDate(transaction, completedTransactions, chains);
      const year = effectiveCloseDate.getFullYear();

      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          totalPnL: 0, // Will be calculated from monthly breakdown
          totalTrades: 0, // Will be calculated from monthly breakdown
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalFees: 0, // Will be calculated from monthly breakdown
          averageDaysHeld: 0,
          bestMonth: { month: '', pnl: -Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 },
          worstMonth: { month: '', pnl: Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 },
          monthlyBreakdown: []
        };
      }
    });

    // Note: totalPnL, totalTrades, and totalFees will be calculated from monthly breakdown below
    // This ensures perfect consistency between yearly and monthly sums

    // Calculate monthly breakdowns using chain-aware P&L attribution
    Object.values(yearlyData).forEach(yearData => {
      const monthlyData: Record<number, MonthlySummary> = {};

      // Get all months that have transactions in this year using effective close dates
      const monthsWithTransactions = new Set<number>();
      completedTransactions
        .filter(t => {
          const effectiveCloseDate = getEffectiveCloseDate(t, completedTransactions, chains);
          return effectiveCloseDate.getFullYear() === yearData.year;
        })
        .forEach(transaction => {
          const effectiveCloseDate = getEffectiveCloseDate(transaction, completedTransactions, chains);
          monthsWithTransactions.add(effectiveCloseDate.getMonth());
        });

      // Calculate chain-aware P&L for each month
      monthsWithTransactions.forEach(month => {
        const monthlyPnL = calculateChainAwareMonthlyPnL(transactions, chains, yearData.year, month);


        // Create month name from a sample date
        const sampleDate = new Date(yearData.year, month, 1);

        monthlyData[month] = {
          month,
          monthName: sampleDate.toLocaleDateString('en-US', { month: 'long' }),
          totalPnL: monthlyPnL.totalPnL,
          totalTrades: monthlyPnL.totalTrades,
          winRate: 0, // Will be calculated below
          fees: monthlyPnL.fees
        };
      });

      yearData.monthlyBreakdown = Object.values(monthlyData).sort((a, b) => a.month - b.month);

      // IMPORTANT: Use monthly breakdown as source of truth for yearly totals
      // This ensures perfect consistency between yearly and monthly sums
      yearData.totalPnL = yearData.monthlyBreakdown.reduce((sum, month) => sum + month.totalPnL, 0);
      yearData.totalTrades = yearData.monthlyBreakdown.reduce((sum, month) => sum + month.totalTrades, 0);
      yearData.totalFees = yearData.monthlyBreakdown.reduce((sum, month) => sum + month.fees, 0);

      // Calculate win rates for each month using chain-aware logic
      let yearlyWinningTrades = 0;

      yearData.monthlyBreakdown.forEach(monthData => {
        const monthTransactions = completedTransactions.filter(t => {
          const closeDate = parseLocalDate(t.closeDate!);
          return closeDate.getFullYear() === yearData.year && closeDate.getMonth() === monthData.month;
        });

        let winningTrades = 0;
        const processedChains = new Set<string>();

        monthTransactions.forEach(transaction => {
          // Skip rolled transactions
          if (transaction.status === 'Rolled') return;

          if (transaction.chainId && !processedChains.has(transaction.chainId)) {
            // Chain transaction - check if entire chain is profitable
            const chain = chains.find(c => c.id === transaction.chainId);
            if (chain && chain.chainStatus === 'Closed') {
              const chainPnL = calculateChainPnL(transaction.chainId, transactions);
              if (chainPnL > 0) winningTrades++;
              processedChains.add(transaction.chainId);
            }
          } else if (!transaction.chainId) {
            // Non-chained transaction
            if ((transaction.profitLoss || 0) > 0) winningTrades++;
          }
        });

        monthData.winRate = monthData.totalTrades > 0 ? (winningTrades / monthData.totalTrades) * 100 : 0;
        yearlyWinningTrades += winningTrades;
      });

      // Calculate yearly win rate hierarchically using the sum of winning trades
      yearData.winningTrades = yearlyWinningTrades;
      yearData.winRate = yearData.totalTrades > 0 ? (yearData.winningTrades / yearData.totalTrades) * 100 : 0;

      // Find best and worst months with enhanced metrics
      if (yearData.monthlyBreakdown.length > 0) {
        // Calculate enhanced metrics for each month using the SAME logic as MonthlyBreakdownSection
        const monthsWithMetrics = yearData.monthlyBreakdown.map(monthData => {
          // Use effective close dates to filter transactions (consistent with monthly breakdown)
          const monthTransactions = completedTransactions.filter(t => {
            const effectiveCloseDate = getEffectiveCloseDate(t, completedTransactions, chains);
            return effectiveCloseDate.getFullYear() === yearData.year && effectiveCloseDate.getMonth() === monthData.month;
          });

          // Use smart capital calculation (overlap-aware) for monthly views
          const capitalResult = calculateSmartCapital(monthTransactions, chains);
          const totalCollateral = capitalResult.totalCapital;

          const totalPnL = monthTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
          const ror = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
          const annualizedRoR = calculateMonthlyAnnualizedRoR(ror);

          return {
            month: monthData.monthName,
            pnl: monthData.totalPnL,
            ror: Number(ror.toFixed(1)),
            preciseRoR: ror,
            annualizedRoR: Number(annualizedRoR.toFixed(1)),
            preciseAnnualizedRoR: annualizedRoR,
            capitalDeployed: totalCollateral,
            trades: monthData.totalTrades
          };
        });

        yearData.bestMonth = monthsWithMetrics.reduce(
          (best, month) => month.pnl > best.pnl ? month : best,
          { month: '', pnl: -Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 }
        );
        yearData.worstMonth = monthsWithMetrics.reduce(
          (worst, month) => month.pnl < worst.pnl ? month : worst,
          { month: '', pnl: Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 }
        );
      }
    });

    return Object.values(yearlyData).sort((a, b) => b.year - a.year);
  }, [allRealizedTransactions, transactions, chains]);

  // Set the most recent year as expanded by default, but respect user interactions
  const mostRecentYear = useMemo(() => {
    if (yearlySummaries.length === 0) return null;
    return Math.max(...yearlySummaries.map(data => data.year));
  }, [yearlySummaries]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Auto-expand most recent year only if user hasn't interacted yet
  React.useEffect(() => {
    if (mostRecentYear !== null && !userHasInteracted) {
      setSelectedYear(mostRecentYear);
    }
  }, [mostRecentYear, userHasInteracted]);

  const overallStats = useMemo(() => {
    // Calculate all-time P&L by summing yearly totals (which are sums of monthly breakdowns)
    // This ensures perfect consistency: Monthly -> Yearly -> All-Time
    const totalPnL = yearlySummaries.reduce((sum, year) => sum + year.totalPnL, 0);

    const totalTrades = yearlySummaries.reduce((sum, year) => sum + year.totalTrades, 0);
    const totalWinningTrades = yearlySummaries.reduce((sum, year) => sum + (year.winningTrades || 0), 0);
    const totalFees = yearlySummaries.reduce((sum, year) => sum + year.totalFees, 0);

    return {
      totalPnL,
      totalTrades,
      winRate: totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0,
      totalFees,
      averageDaysHeld: allRealizedTransactions.length > 0
        ? allRealizedTransactions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate || new Date()), 0) / allRealizedTransactions.length
        : 0
    };
  }, [allRealizedTransactions, yearlySummaries]);

  const strategyPerformance = useMemo(() => {
    return calculateStrategyPerformance(transactions, chains);
  }, [transactions, chains]);

  const monthlyTopTickers = useMemo(() => {
    return calculateMonthlyTopTickers(transactions, chains);
  }, [transactions, chains]);


  // Helper functions for child components
  const getChartDataForYear = (year: number) => {
    const yearSummary = yearlySummaries.find(y => y.year === year);
    if (!yearSummary) return [];

    return yearSummary.monthlyBreakdown.map(month => {
      // Calculate RoR for this month by getting all transactions for this month
      const monthTransactions = allRealizedTransactions.filter(t => {
        if (!t.closeDate) return false;
        const effectiveCloseDate = getEffectiveCloseDate(t, allRealizedTransactions, chains);
        return effectiveCloseDate.getFullYear() === year && effectiveCloseDate.getMonth() === month.month;
      });

      // Use smart capital calculation (overlap-aware) for monthly chart data
      const capitalResult = calculateSmartCapital(monthTransactions, chains);
      const totalCollateral = capitalResult.totalCapital;

      const ror = totalCollateral > 0 ? (month.totalPnL / totalCollateral * 100) : 0;

      return {
        month: month.monthName,
        pnl: month.totalPnL,
        ror: Number(ror.toFixed(1))
      };
    });
  };

  const getAllTickersForYear = (year: number) => {
    const realizedTransactions = allRealizedTransactions.filter(t => {
      if (!t.closeDate) return false;
      const effectiveCloseDate = getEffectiveCloseDate(t, allRealizedTransactions, chains);
      return effectiveCloseDate.getFullYear() === year;
    });

    // For YEARLY stock views, we CAN use overlap detection because all trades
    // opened and closed within the same year, so date ranges are meaningful
    const yearTickerTotals = calculateChainAwareStockPerformance(realizedTransactions, chains);
    const capitalResult = calculateSmartCapital(realizedTransactions, chains);

    // Create a map of stock to capital from the breakdown
    const stockCapitalMap = new Map<string, number>();
    capitalResult.breakdown.forEach(item => {
      stockCapitalMap.set(item.stock, item.capital);
    });

    const allTickers = Array.from(yearTickerTotals.entries())
      .map(([ticker, data]) => {
        const capital = stockCapitalMap.get(ticker) || data.totalCollateral;
        return {
          ticker,
          pnl: Math.round(data.pnl),
          ror: capital > 0 ? Number((data.pnl / capital * 100).toFixed(1)) : 0,
          trades: data.trades,
          totalCollateral: capital,
          annualizedRoR: capital > 0 ? Number(((data.pnl / capital) * (365 / 30) * 100).toFixed(1)) : 0
        };
      })
      .sort((a, b) => b.pnl - a.pnl);

    return allTickers;
  };

  const getTop5TickersForYear = (year: number) => {
    return getAllTickersForYear(year).slice(0, 5);
  };

  const getTopTickersForMonth = (year: number, month: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    return monthlyTopTickers.find(data => data.monthKey === monthKey);
  };

  // Calculate best stocks overall
  const bestStocks = useMemo(() => {
    const yearTickerTotals = calculateChainAwareStockPerformance(allRealizedTransactions, chains);
    const capitalResult = calculateSmartCapital(allRealizedTransactions, chains);

    // Create a map of stock to capital from the breakdown
    const stockCapitalMap = new Map<string, number>();
    capitalResult.breakdown.forEach(item => {
      stockCapitalMap.set(item.stock, item.capital);
    });

    const stockPerformance = Array.from(yearTickerTotals.entries()).map(([ticker, data]) => {
      const capital = stockCapitalMap.get(ticker) || data.totalCollateral;
      return {
        ticker,
        pnl: data.pnl,
        ror: capital > 0 ? (data.pnl / capital * 100) : 0,
        trades: data.trades
      };
    });

    const bestByPnL = stockPerformance.length > 0
      ? stockPerformance.reduce((best, stock) => stock.pnl > best.pnl ? stock : best, { ticker: '', pnl: -Infinity, ror: 0, trades: 0 })
      : { ticker: '', pnl: 0, ror: 0, trades: 0 };

    const bestByRoR = stockPerformance.length > 0
      ? stockPerformance.reduce((best, stock) => stock.ror > best.ror ? stock : best, { ticker: '', pnl: 0, ror: -Infinity, trades: 0 })
      : { ticker: '', pnl: 0, ror: 0, trades: 0 };

    return {
      bestByPnL: bestByPnL.pnl > -Infinity ? { ticker: bestByPnL.ticker, pnl: bestByPnL.pnl } : null,
      bestByRoR: bestByRoR.ror > -Infinity ? { ticker: bestByRoR.ticker, ror: bestByRoR.ror } : null
    };
  }, [allRealizedTransactions, chains]);

  // Calculate quick stats data
  const preciseAvgRoR = calculateSmartPortfolioRoR(transactions, chains);

  // Use the common function to calculate yearly annualized RoR with active months
  const yearlyRoRData = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, chains);
  const activeTradingDays = yearlyRoRData.activeTradingDays;

  // For consistency, use the same active trading days approach for all-time calculation
  // Since all transactions are from current year, both should be identical
  const preciseAnnualizedRoR = yearlyRoRData.annualizedRoR;

  // For tooltip context, we still need totalDaysSinceInception for display purposes
  const portfolioStartDate = transactions.length > 0
    ? new Date(Math.min(...transactions.map(t => new Date(t.tradeOpenDate).getTime())))
    : new Date();

  const totalDaysSinceInception = Math.max(
    Math.ceil((new Date().getTime() - portfolioStartDate.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );

  const quickStatsData = {
    totalPnL: overallStats.totalPnL,
    totalTrades: overallStats.totalTrades,
    winRate: overallStats.winRate,
    avgRoR: preciseAvgRoR,
    preciseAvgRoR,
    annualizedRoR: preciseAnnualizedRoR,
    preciseAnnualizedRoR,
    activeTradingDays, // Used for both yearly and all-time context tooltips (consistent calculation)
    totalDaysSinceInception, // Keep for reference, but both calculations now use activeTradingDays
    bestStrategy: strategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: strategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: strategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStocks.bestByPnL,
    bestStockByRoR: bestStocks.bestByRoR
  };

  if (transactions.length === 0 && !activeAiFilters) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-xl mb-2">No transactions found</p>
          <p>Add some trades to see your analytics!</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    // Mobile view: Show only the monthly breakdown table
    return (
      <div className="space-y-4">
        <YearlyPerformanceCard
          yearlySummaries={yearlySummaries}
          selectedYear={selectedYear}
          setSelectedYear={(year) => {
            setUserHasInteracted(true);
            setSelectedYear(year);
          }}
          getChartDataForYear={getChartDataForYear}
          getTop5TickersForYear={getTop5TickersForYear}
          getAllTickersForYear={getAllTickersForYear}
          getTopTickersForMonth={getTopTickersForMonth}
          transactions={transactions}
          chains={chains}
          selectedPortfolioName={selectedPortfolioName}
          mobileOnly={true}
        />
      </div>
    );
  }

  // Desktop view: Show all analytics components
  return (
    <div className="space-y-8">
      {/* AI Filter UI */}
      <div className="bg-muted/30 p-4 rounded-lg border border-border">
        <form onSubmit={handleAiSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask AI to filter... (e.g., 'Show me winning TSLA puts')"
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isAiLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isAiLoading || !aiQuery.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isAiLoading ? 'Thinking...' : 'Filter'}
          </button>
          {activeAiFilters && (
            <button
              type="button"
              onClick={clearAiFilters}
              className="px-4 py-2 border bg-background text-foreground rounded-md text-sm font-medium hover:bg-muted"
            >
              Clear
            </button>
          )}
        </form>

        {aiError && (
          <p className="text-red-500 text-sm mt-2">{aiError}</p>
        )}

        {activeAiFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-sm text-muted-foreground flex items-center">AI Filters applied:</span>
            {activeAiFilters.symbol && (
              <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-xs rounded-full border border-sky-200 dark:border-sky-800">
                Symbol: {activeAiFilters.symbol.toUpperCase()}
              </span>
            )}
            {activeAiFilters.type && (
              <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-xs rounded-full border border-sky-200 dark:border-sky-800">
                Type: {activeAiFilters.type}
              </span>
            )}
            {activeAiFilters.outcome && (
              <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-xs rounded-full border border-sky-200 dark:border-sky-800">
                Outcome: {activeAiFilters.outcome === 'win' ? 'Wins only' : 'Losses only'}
              </span>
            )}
          </div>
        )}
      </div>
      <AllTimePortfolioAnalytics selectedPortfolioName={selectedPortfolioName}>
        <QuickStatsCard {...quickStatsData} />
        <StrategyPerformanceCard strategyPerformance={strategyPerformance} />
      </AllTimePortfolioAnalytics>

      <YearlyPerformanceCard
        yearlySummaries={yearlySummaries}
        selectedYear={selectedYear}
        setSelectedYear={(year) => {
          setUserHasInteracted(true);
          setSelectedYear(year);
        }}
        getChartDataForYear={getChartDataForYear}
        getTop5TickersForYear={getTop5TickersForYear}
        getAllTickersForYear={getAllTickersForYear}
        getTopTickersForMonth={getTopTickersForMonth}
        transactions={transactions}
        chains={chains}
        selectedPortfolioName={selectedPortfolioName}
        mobileOnly={false}
      />

      <BenchmarkComparisonChart
        months={24}
        className="w-full"
      />
    </div>
  );
}
