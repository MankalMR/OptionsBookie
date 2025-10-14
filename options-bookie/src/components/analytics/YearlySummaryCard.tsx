'use client';

import { formatPnLCurrency, getRealizedTransactions, calculateStrategyPerformance, calculateCollateral } from '@/utils/optionsCalculations';
import { OptionsTransaction } from '@/types/options';
import { parseLocalDate } from '@/utils/dateUtils';
import MonthlyBreakdownSection from './MonthlyBreakdownSection';
import Top5TickersSection from './Top5TickersSection';
import YearPortfolioAnalytics from './YearPortfolioAnalytics';
import QuickStatsCard from './QuickStatsCard';
import StrategyPerformanceCard from './StrategyPerformanceCard';

interface YearlyData {
  year: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  averageDaysHeld: number;
  bestMonth: { month: string; pnl: number; ror: number; capitalDeployed: number; trades: number };
  worstMonth: { month: string; pnl: number; ror: number; capitalDeployed: number; trades: number };
  monthlyBreakdown: Array<{
    month: number;
    monthName: string;
    totalPnL: number;
    totalTrades: number;
    winRate: number;
    fees: number;
  }>;
}

interface TickerData {
  ticker: string;
  pnl: number;
  ror: number;
  trades: number;
}

interface TopTickers {
  topByPnL: { ticker: string; pnl: number };
  topByRoR: { ticker: string; ror: number };
}

interface ChartDataPoint {
  month: string;
  pnl: number;
  ror: number;
}

interface YearlySummaryCardProps {
  yearData: YearlyData;
  selectedYear: number | null;
  onToggleYear: (year: number) => void;
  chartData: ChartDataPoint[];
  yearTop5Tickers: TickerData[];
  getTopTickersForMonth: (year: number, month: number) => TopTickers | undefined;
  transactions: OptionsTransaction[];
  selectedPortfolioName?: string | null;
  mobileOnly?: boolean;
}

export default function YearlySummaryCard({
  yearData,
  selectedYear,
  onToggleYear,
  chartData,
  yearTop5Tickers,
  getTopTickersForMonth,
  transactions,
  selectedPortfolioName,
  mobileOnly = false
}: YearlySummaryCardProps) {
  const formatCurrency = formatPnLCurrency;

  // Filter transactions for this specific year
  const yearTransactions = transactions.filter(transaction => {
    if (!transaction.closeDate) return false;
    const closeDate = parseLocalDate(transaction.closeDate);
    return closeDate.getFullYear() === yearData.year;
  });

  // Calculate year-specific metrics for Quick Stats
  const realizedTransactions = getRealizedTransactions(yearTransactions);
  const totalPnL = realizedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  const winningTrades = realizedTransactions.filter(t => (t.profitLoss || 0) > 0);
  const winRate = realizedTransactions.length > 0 ? (winningTrades.length / realizedTransactions.length) * 100 : 0;

  // Calculate year-specific strategy performance
  const yearStrategyPerformance = calculateStrategyPerformance(yearTransactions);

  // Calculate best stock by P&L and RoR for this year
  const stockPerformance = new Map<string, { pnl: number; trades: number; totalCollateral: number }>();
  realizedTransactions.forEach(t => {
    const symbol = t.stockSymbol;
    if (!stockPerformance.has(symbol)) {
      stockPerformance.set(symbol, { pnl: 0, trades: 0, totalCollateral: 0 });
    }
    const perf = stockPerformance.get(symbol)!;
    perf.pnl += t.profitLoss || 0;
    perf.trades += 1;
    perf.totalCollateral += calculateCollateral(t);
  });

  const bestStockByPnL = Array.from(stockPerformance.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0];

  const bestStockByRoR = Array.from(stockPerformance.entries())
    .map(([ticker, data]) => ({
      ticker,
      ror: data.totalCollateral > 0 ? (data.pnl / data.totalCollateral * 100) : 0
    }))
    .sort((a, b) => b.ror - a.ror)[0];

  const quickStatsData = {
    totalPnL,
    totalTrades: realizedTransactions.length,
    winRate,
    avgRoR: yearStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? yearStrategyPerformance.filter(s => s.realizedCount > 0).reduce((sum, s) => sum + s.avgRoR, 0) / yearStrategyPerformance.filter(s => s.realizedCount > 0).length
      : 0,
    bestStrategy: yearStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStockByPnL ? { ticker: bestStockByPnL[0], pnl: bestStockByPnL[1].pnl } : null,
    bestStockByRoR: bestStockByRoR ? { ticker: bestStockByRoR.ticker, ror: bestStockByRoR.ror } : null
  };

  // Mobile view: Show only monthly breakdown table with old structure
  if (mobileOnly) {
    return (
      <div key={yearData.year} className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-card-foreground">{yearData.year}</h3>
          <button
            onClick={() => onToggleYear(yearData.year)}
            className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium"
          >
            {selectedYear === yearData.year ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {selectedYear === yearData.year && (
          <div className="mt-6">
            <MonthlyBreakdownSection
              yearData={yearData}
              chartData={chartData}
              getTopTickersForMonth={getTopTickersForMonth}
              transactions={transactions}
              selectedPortfolioName={selectedPortfolioName}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop view: Use YearPortfolioAnalytics as the main container
  const isExpanded = selectedYear === yearData.year;
  const handleToggle = () => {
    onToggleYear(yearData.year);
  };

  return (
    <YearPortfolioAnalytics
      key={yearData.year}
      year={yearData.year}
      selectedPortfolioName={selectedPortfolioName}
      isExpanded={isExpanded}
      onToggle={handleToggle}
    >
      <QuickStatsCard {...quickStatsData} />
      <StrategyPerformanceCard strategyPerformance={yearStrategyPerformance} />

      {/* Top 5 Tickers for the Year */}
      <Top5TickersSection yearTop5Tickers={yearTop5Tickers} />

      {/* Monthly Breakdown for the Year */}
      <MonthlyBreakdownSection
        yearData={yearData}
        chartData={chartData}
        getTopTickersForMonth={getTopTickersForMonth}
        transactions={transactions}
        selectedPortfolioName={selectedPortfolioName}
      />

      {/* Best/Worst Month Cards - Summary of Monthly Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
          <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium mb-2">
            Best Month: {yearData.bestMonth.month}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(yearData.bestMonth.pnl)}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">P&L</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                {yearData.bestMonth.ror.toFixed(1)}%
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">RoR</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                {formatCurrency(yearData.bestMonth.capitalDeployed)}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">Capital</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
            Worst Month: {yearData.worstMonth.month}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="font-semibold text-red-800 dark:text-red-200">
                {formatCurrency(yearData.worstMonth.pnl)}
              </p>
              <p className="text-red-600 dark:text-red-400">P&L</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-800 dark:text-red-200">
                {yearData.worstMonth.ror.toFixed(1)}%
              </p>
              <p className="text-red-600 dark:text-red-400">RoR</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-800 dark:text-red-200">
                {formatCurrency(yearData.worstMonth.capitalDeployed)}
              </p>
              <p className="text-red-600 dark:text-red-400">Capital</p>
            </div>
          </div>
        </div>
      </div>
    </YearPortfolioAnalytics>
  );
}

