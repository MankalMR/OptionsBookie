'use client';

import { formatPnLCurrency } from '@/utils/optionsCalculations';
import { OptionsTransaction } from '@/types/options';
import MonthlyBreakdownSection from './MonthlyBreakdownSection';
import Top5TickersSection from './Top5TickersSection';

interface YearlyData {
  year: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  averageDaysHeld: number;
  bestMonth: { month: string; pnl: number };
  worstMonth: { month: string; pnl: number };
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
  mobileOnly = false
}: YearlySummaryCardProps) {
  const formatCurrency = formatPnLCurrency;

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <p className={`text-lg font-semibold ${yearData.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(yearData.totalPnL)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Trades</p>
          <p className="text-lg font-semibold text-card-foreground">{yearData.totalTrades}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-lg font-semibold text-card-foreground">{Math.round(yearData.winRate)}%</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Days Held</p>
          <p className="text-lg font-semibold text-card-foreground">{Math.round(yearData.averageDaysHeld)}</p>
        </div>
      </div>

      {selectedYear === yearData.year && (
        <div className="mt-6 space-y-6">
          {mobileOnly ? (
            // Mobile view: Show only monthly breakdown table
            <MonthlyBreakdownSection
              yearData={yearData}
              chartData={chartData}
              getTopTickersForMonth={getTopTickersForMonth}
              transactions={transactions}
            />
          ) : (
            // Desktop view: Show all analytics
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">Best Month</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {yearData.bestMonth.month}: {formatCurrency(yearData.bestMonth.pnl)}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">Worst Month</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-100">
                    {yearData.worstMonth.month}: {formatCurrency(yearData.worstMonth.pnl)}
                  </p>
                </div>
              </div>

              <MonthlyBreakdownSection
                yearData={yearData}
                chartData={chartData}
                getTopTickersForMonth={getTopTickersForMonth}
                transactions={transactions}
              />

              <Top5TickersSection yearTop5Tickers={yearTop5Tickers} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

