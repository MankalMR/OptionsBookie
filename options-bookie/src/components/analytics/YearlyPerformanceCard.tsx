'use client';

import { formatPnLCurrency } from '@/utils/optionsCalculations';
import { OptionsTransaction, TradeChain } from '@/types/options';
import { YearlySummary } from '@/components/SummaryView';
import YearlySummaryCard from './YearlySummaryCard';


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

interface YearlyPerformanceCardProps {
  yearlySummaries: YearlySummary[];
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  getChartDataForYear: (year: number) => ChartDataPoint[];
  getTop5TickersForYear: (year: number) => TickerData[];
  getAllTickersForYear: (year: number) => TickerData[];
  getTopTickersForMonth: (year: number, month: number) => TopTickers | undefined;
  transactions: OptionsTransaction[];
  chains?: TradeChain[];
  selectedPortfolioName?: string | null;
  mobileOnly?: boolean;
}

export default function YearlyPerformanceCard({
  yearlySummaries,
  selectedYear,
  setSelectedYear,
  getChartDataForYear,
  getTop5TickersForYear,
  getAllTickersForYear,
  getTopTickersForMonth,
  transactions,
  chains = [],
  selectedPortfolioName,
  mobileOnly = false
}: YearlyPerformanceCardProps) {
  const formatCurrency = formatPnLCurrency;

  const handleToggleYear = (year: number) => {
    setSelectedYear(selectedYear === year ? null : year);
  };

  if (yearlySummaries.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Yearly Performance</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No yearly data available</p>
        </div>
      </div>
    );
  }

  if (mobileOnly) {
    // Mobile view: Show only the monthly breakdown table without charts or stats
    return (
      <div className="space-y-4">
        {yearlySummaries.map((yearData) => (
          <YearlySummaryCard
            key={yearData.year}
            yearData={yearData}
            selectedYear={selectedYear}
            onToggleYear={handleToggleYear}
            chartData={getChartDataForYear(yearData.year)}
            yearTop5Tickers={getTop5TickersForYear(yearData.year)}
            yearAllTickers={getAllTickersForYear(yearData.year)}
            getTopTickersForMonth={getTopTickersForMonth}
            transactions={transactions}
            chains={chains}
            selectedPortfolioName={selectedPortfolioName}
            mobileOnly={true}
          />
        ))}
      </div>
    );
  }

  // Desktop view: Show full analytics
  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <h2 className="text-2xl font-bold text-card-foreground mb-6">Yearly Performance</h2>
      <div className="space-y-4">
        {yearlySummaries.map((yearData) => (
          <YearlySummaryCard
            key={yearData.year}
            yearData={yearData}
            selectedYear={selectedYear}
            onToggleYear={handleToggleYear}
            chartData={getChartDataForYear(yearData.year)}
            yearTop5Tickers={getTop5TickersForYear(yearData.year)}
            yearAllTickers={getAllTickersForYear(yearData.year)}
            getTopTickersForMonth={getTopTickersForMonth}
            transactions={transactions}
            chains={chains}
            selectedPortfolioName={selectedPortfolioName}
            mobileOnly={false}
          />
        ))}
      </div>

      {/* Overall Yearly Stats */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">All-Time Highlights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">Best Year</p>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.totalPnL > best.totalPnL ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">Worst Year</p>
            <p className="text-xl font-bold text-red-900 dark:text-red-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((worst, year) => year.totalPnL < worst.totalPnL ? year : worst).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">Highest Win Rate Year</p>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.winRate > best.winRate ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
            <p className="text-sm text-violet-800 dark:text-violet-200 font-medium">Most Active Year</p>
            <p className="text-xl font-bold text-violet-900 dark:text-violet-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((most, year) => year.totalTrades > most.totalTrades ? year : most).year
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

