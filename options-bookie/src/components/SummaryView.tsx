'use client';

import React, { useMemo, useState } from 'react';
import { OptionsTransaction } from '@/types/options';
import {
  calculateDaysHeld,
  getRealizedTransactions,
  calculateTotalRealizedPnL,
  calculateStrategyPerformance,
  calculateMonthlyTopTickers,
  calculateCollateral
} from '@/utils/optionsCalculations';

// Import our new modular components
import QuickStatsCard from './analytics/QuickStatsCard';
import StrategyPerformanceCard from './analytics/StrategyPerformanceCard';
import YearlyPerformanceCard from './analytics/YearlyPerformanceCard';

interface SummaryViewProps {
  transactions: OptionsTransaction[];
}

interface MonthlySummary {
  month: number;
  monthName: string;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  fees: number;
}

interface YearlySummary {
  year: number;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalFees: number;
  averageDaysHeld: number;
  bestMonth: { month: string; pnl: number };
  worstMonth: { month: string; pnl: number };
  monthlyBreakdown: MonthlySummary[];
}

export default function SummaryView({ transactions }: SummaryViewProps) {
  const yearlySummaries = useMemo(() => {
    const completedTransactions = getRealizedTransactions(transactions).filter(t =>
      t.closeDate
    );

    const yearlyData: Record<number, YearlySummary> = {};

    completedTransactions.forEach(transaction => {
      const closeDate = transaction.closeDate
        ? new Date(transaction.closeDate)
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
          bestMonth: { month: '', pnl: -Infinity },
          worstMonth: { month: '', pnl: Infinity },
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

    // Calculate monthly breakdowns
    Object.values(yearlyData).forEach(yearData => {
      const monthlyData: Record<number, MonthlySummary> = {};

      completedTransactions
        .filter(t => {
          const closeDate = new Date(t.closeDate!);
          return closeDate.getFullYear() === yearData.year;
        })
        .forEach(transaction => {
          const closeDate = new Date(transaction.closeDate!);
          const month = closeDate.getMonth();

          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              monthName: closeDate.toLocaleDateString('en-US', { month: 'long' }),
              totalPnL: 0,
              totalTrades: 0,
              winRate: 0,
              fees: 0
            };
          }

          const pnl = transaction.profitLoss || 0;
          monthlyData[month].totalPnL += pnl;
          monthlyData[month].totalTrades += 1;
          monthlyData[month].fees += transaction.fees || 0;
        });

      yearData.monthlyBreakdown = Object.values(monthlyData).sort((a, b) => a.month - b.month);

      // Calculate win rates for each month
      yearData.monthlyBreakdown.forEach(monthData => {
        const monthTransactions = completedTransactions.filter(t => {
          const closeDate = new Date(t.closeDate!);
          return closeDate.getFullYear() === yearData.year && closeDate.getMonth() === monthData.month;
        });
        const winningTrades = monthTransactions.filter(t => (t.profitLoss || 0) > 0).length;
        monthData.winRate = monthData.totalTrades > 0 ? (winningTrades / monthData.totalTrades) * 100 : 0;
      });

      // Find best and worst months
      if (yearData.monthlyBreakdown.length > 0) {
        yearData.bestMonth = yearData.monthlyBreakdown.reduce(
          (best, month) => month.totalPnL > best.pnl ? { month: month.monthName, pnl: month.totalPnL } : best,
          { month: '', pnl: -Infinity }
        );
        yearData.worstMonth = yearData.monthlyBreakdown.reduce(
          (worst, month) => month.totalPnL < worst.pnl ? { month: month.monthName, pnl: month.totalPnL } : worst,
          { month: '', pnl: Infinity }
        );
      }
    });

    return Object.values(yearlyData).sort((a, b) => b.year - a.year);
  }, [transactions]);

  // Set the most recent year as expanded by default
  const mostRecentYear = useMemo(() => {
    if (yearlySummaries.length === 0) return null;
    return Math.max(...yearlySummaries.map(data => data.year));
  }, [yearlySummaries]);

  const [selectedYear, setSelectedYear] = useState<number | null>(mostRecentYear);

  // Update selectedYear when mostRecentYear changes (e.g., new year data or initial load)
  React.useEffect(() => {
    if (mostRecentYear !== null && selectedYear === null) {
      setSelectedYear(mostRecentYear);
    }
  }, [mostRecentYear, selectedYear]);

  const overallStats = useMemo(() => {
    const realizedTransactions = getRealizedTransactions(transactions);
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
    return calculateStrategyPerformance(transactions);
  }, [transactions]);

  const monthlyTopTickers = useMemo(() => {
    return calculateMonthlyTopTickers(transactions);
  }, [transactions]);


  // Helper functions for child components
  const getChartDataForYear = (year: number) => {
    const yearSummary = yearlySummaries.find(y => y.year === year);
    if (!yearSummary) return [];

    return yearSummary.monthlyBreakdown.map(month => {
      // Calculate RoR for this month by getting all transactions for this month
      const monthTransactions = getRealizedTransactions(transactions).filter(t => {
        if (!t.closeDate) return false;
        const closeDate = new Date(t.closeDate);
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
    const realizedTransactions = getRealizedTransactions(transactions).filter(t => {
      if (!t.closeDate) return false;
      const closeDate = new Date(t.closeDate);
      return closeDate.getFullYear() === year;
    });

    const yearTickerTotals = new Map<string, {
      pnl: number;
      ror: number;
      trades: number;
      collateral: number;
    }>();

    realizedTransactions.forEach(transaction => {
      const ticker = transaction.stockSymbol;
      const pnl = transaction.profitLoss || 0;
      const collateral = calculateCollateral(transaction);

      if (!yearTickerTotals.has(ticker)) {
        yearTickerTotals.set(ticker, { pnl: 0, ror: 0, trades: 0, collateral: 0 });
      }

      const tickerData = yearTickerTotals.get(ticker)!;
      tickerData.pnl += pnl;
      tickerData.trades += 1;
      tickerData.collateral += collateral;
    });

    const yearTop5 = Array.from(yearTickerTotals.entries())
      .map(([ticker, data]) => ({
        ticker,
        pnl: Math.round(data.pnl),
        ror: data.collateral > 0 ? Number((data.pnl / data.collateral * 100).toFixed(1)) : 0,
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
  const quickStatsData = {
    totalPnL: overallStats.totalPnL,
    totalTrades: overallStats.totalTrades,
    winRate: overallStats.winRate,
    avgRoR: strategyPerformance.length > 0 
      ? strategyPerformance.reduce((sum, s) => sum + s.avgRoR, 0) / strategyPerformance.length 
      : 0,
    bestStrategy: strategyPerformance.length > 0 
      ? { name: strategyPerformance[0].strategy, ror: strategyPerformance[0].avgRoR }
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

  return (
    <div className="space-y-8">
      <QuickStatsCard {...quickStatsData} />

      <StrategyPerformanceCard strategyPerformance={strategyPerformance} />

      <YearlyPerformanceCard
        yearlySummaries={yearlySummaries}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        getChartDataForYear={getChartDataForYear}
        getTop5TickersForYear={getTop5TickersForYear}
        getTopTickersForMonth={getTopTickersForMonth}
      />
    </div>
  );
}
