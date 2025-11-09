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
  getEffectiveCloseDate
} from '@/utils/optionsCalculations';
import { parseLocalDate } from '@/utils/dateUtils';
import { useIsMobile } from '@/hooks/useMediaQuery';

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

export default function SummaryView({ transactions, selectedPortfolioName, chains = [] }: SummaryViewProps) {
  const isMobile = useIsMobile();
  const yearlySummaries = useMemo(() => {
    const completedTransactions = getRealizedTransactions(transactions, chains).filter(t =>
      t.closeDate
    );


    const yearlyData: Record<number, YearlySummary> = {};

    completedTransactions.forEach(transaction => {
      const closeDate = transaction.closeDate
        ? parseLocalDate(transaction.closeDate)
        : new Date();
      const year = closeDate.getFullYear();

      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          totalPnL: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalFees: 0,
          averageDaysHeld: 0,
          bestMonth: { month: '', pnl: -Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 },
          worstMonth: { month: '', pnl: Infinity, ror: 0, preciseRoR: 0, annualizedRoR: 0, preciseAnnualizedRoR: 0, capitalDeployed: 0, trades: 0 },
          monthlyBreakdown: []
        };
      }

      const pnl = transaction.profitLoss || 0;
      const fees = transaction.fees || 0;
      const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate || new Date());

      yearlyData[year].totalPnL += pnl;
      yearlyData[year].totalTrades += 1;
      yearlyData[year].totalFees += fees;
      yearlyData[year].averageDaysHeld += daysHeld;

      if (pnl > 0) {
        yearlyData[year].winningTrades += 1;
      } else if (pnl < 0) {
        yearlyData[year].losingTrades += 1;
      }
    });

    // Calculate win rates and averages
    Object.values(yearlyData).forEach(yearData => {
      yearData.winRate = yearData.totalTrades > 0 ? (yearData.winningTrades / yearData.totalTrades) * 100 : 0;
      yearData.averageDaysHeld = yearData.totalTrades > 0 ? yearData.averageDaysHeld / yearData.totalTrades : 0;
    });

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

      // Calculate win rates for each month using chain-aware logic
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
      });

      // Find best and worst months with enhanced metrics
      if (yearData.monthlyBreakdown.length > 0) {
        // Calculate enhanced metrics for each month
        const monthsWithMetrics = yearData.monthlyBreakdown.map(monthData => {
          const monthTransactions = completedTransactions.filter(t => {
            const closeDate = parseLocalDate(t.closeDate!);
            return closeDate.getFullYear() === yearData.year && closeDate.getMonth() === monthData.month;
          });

          const totalCollateral = monthTransactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
          const ror = calculatePortfolioRoR(monthTransactions);
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
  }, [transactions, chains]);

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
    const realizedTransactions = getRealizedTransactions(transactions, chains);
    const totalPnL = calculateTotalRealizedPnL(transactions);
    const totalTrades = realizedTransactions.length;
    const winningTrades = realizedTransactions.filter(t => (t.profitLoss || 0) > 0).length;
    const totalFees = realizedTransactions.reduce((sum, t) => sum + (t.fees || 0), 0);

    return {
      totalPnL,
      totalTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalFees,
      averageDaysHeld: realizedTransactions.length > 0
        ? realizedTransactions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate || new Date()), 0) / realizedTransactions.length
        : 0
    };
  }, [transactions]);

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
      const monthTransactions = getRealizedTransactions(transactions).filter(t => {
        if (!t.closeDate) return false;
        const closeDate = parseLocalDate(t.closeDate);
        return closeDate.getFullYear() === year && closeDate.getMonth() === month.month;
      });

      const totalCollateral = monthTransactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
      const ror = totalCollateral > 0 ? (month.totalPnL / totalCollateral * 100) : 0;

      return {
        month: month.monthName,
        pnl: month.totalPnL,
        ror: Number(ror.toFixed(1))
      };
    });
  };

  const getTop5TickersForYear = (year: number) => {
    const realizedTransactions = getRealizedTransactions(transactions, chains).filter(t => {
      if (!t.closeDate) return false;
      const closeDate = parseLocalDate(t.closeDate);
      return closeDate.getFullYear() === year;
    });

    // Use chain-aware stock performance calculation
    const yearTickerTotals = calculateChainAwareStockPerformance(realizedTransactions, chains);

    const yearTop5 = Array.from(yearTickerTotals.entries())
      .map(([ticker, data]) => ({
        ticker,
        pnl: Math.round(data.pnl),
        ror: data.totalCollateral > 0 ? Number((data.pnl / data.totalCollateral * 100).toFixed(1)) : 0,
        trades: data.trades
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    return yearTop5;
  };

  const getTopTickersForMonth = (year: number, month: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    return monthlyTopTickers.find(data => data.monthKey === monthKey);
  };

  // Calculate best stocks overall
  const bestStocks = useMemo(() => {
    const realizedTransactions = getRealizedTransactions(transactions);
    const stockTotals = new Map<string, { pnl: number; collateral: number; trades: number }>();

    realizedTransactions.forEach(transaction => {
      const ticker = transaction.stockSymbol;
      const pnl = transaction.profitLoss || 0;
      const collateral = calculateCollateral(transaction);

      if (!stockTotals.has(ticker)) {
        stockTotals.set(ticker, { pnl: 0, collateral: 0, trades: 0 });
      }

      const stockData = stockTotals.get(ticker)!;
      stockData.pnl += pnl;
      stockData.collateral += collateral;
      stockData.trades += 1;
    });

    // Calculate RoR for each stock and find best performers
    const stockPerformance = Array.from(stockTotals.entries()).map(([ticker, data]) => ({
      ticker,
      pnl: data.pnl,
      ror: data.collateral > 0 ? (data.pnl / data.collateral * 100) : 0,
      trades: data.trades
    }));

    const bestByPnL = stockPerformance.reduce((best, stock) =>
      stock.pnl > best.pnl ? stock : best, { ticker: '', pnl: -Infinity, ror: 0, trades: 0 });

    const bestByRoR = stockPerformance.reduce((best, stock) =>
      stock.ror > best.ror ? stock : best, { ticker: '', pnl: 0, ror: -Infinity, trades: 0 });

    return {
      bestByPnL: bestByPnL.pnl > -Infinity ? { ticker: bestByPnL.ticker, pnl: bestByPnL.pnl } : null,
      bestByRoR: bestByRoR.ror > -Infinity ? { ticker: bestByRoR.ticker, ror: bestByRoR.ror } : null
    };
  }, [transactions]);

  // Calculate quick stats data
  const preciseAvgRoR = calculatePortfolioRoR(transactions);

  // Use the common function to calculate yearly annualized RoR with active months
  const yearlyRoRData = calculateYearlyAnnualizedRoRWithActiveMonths(transactions);
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

  if (transactions.length === 0) {
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
