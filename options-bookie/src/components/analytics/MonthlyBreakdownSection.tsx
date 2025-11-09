'use client';

import React, { useState } from 'react';
import { formatPnLCurrency, getRealizedTransactions, calculateCollateral, calculateDaysHeld, calculateStrategyPerformance, calculatePortfolioRoR, calculateMonthlyPortfolioAnnualizedRoR, getEffectiveCloseDate } from '@/utils/optionsCalculations';
import { RegularRoRTooltip, AnnualizedRoRTooltip } from '@/components/ui/RoRTooltip';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { OptionsTransaction, TradeChain } from '@/types/options';
import MonthlyTradesTable from './MonthlyTradesTable';
import { parseLocalDate } from '@/utils/dateUtils';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MonthlyData {
  month: number;
  monthName: string;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  fees: number;
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

interface MonthlyBreakdownSectionProps {
  yearData: {
    year: number;
    monthlyBreakdown: MonthlyData[];
  };
  chartData: ChartDataPoint[];
  getTopTickersForMonth: (year: number, month: number) => TopTickers | undefined;
  transactions: OptionsTransaction[]; // Add transactions for drill-down
  chains?: TradeChain[]; // Add chains for chain-aware filtering
  selectedPortfolioName?: string | null;
}

export default function MonthlyBreakdownSection({
  yearData,
  chartData,
  getTopTickersForMonth,
  transactions,
  chains = [],
  selectedPortfolioName
}: MonthlyBreakdownSectionProps) {
  const isMobile = useIsMobile();

  // No months expanded by default - user must explicitly click to expand
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  // Chart collapsed by default - user must explicitly click to expand
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  const toggleMonth = (month: number) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  // Get transactions for a specific month using chain-aware filtering and effective close dates
  const getMonthTransactions = (month: number): OptionsTransaction[] => {
    const realizedTransactions = getRealizedTransactions(transactions, chains).filter(t => t.closeDate);

    const monthTransactions = realizedTransactions.filter(t => {
      const effectiveCloseDate = getEffectiveCloseDate(t, realizedTransactions, chains);
      return effectiveCloseDate.getFullYear() === yearData.year && effectiveCloseDate.getMonth() === month;
    });


    return monthTransactions;
  };
  const formatCurrency = formatPnLCurrency;

  return (
    <div className="bg-muted/20 rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-card-foreground">Monthly Breakdown</h3>
        <button
          onClick={() => setIsChartExpanded(!isChartExpanded)}
          className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium"
        >
          {isChartExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Hide Chart
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              Show Chart
            </>
          )}
        </button>
      </div>

      {isChartExpanded && (() => {
        return chartData && chartData.length > 0 ? (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="pnl"
                  orientation="left"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  yAxisId="ror"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const month = label;
                      const pnlValue = payload.find(p => p.dataKey === 'pnl')?.value || 0;
                      const rorValue = payload.find(p => p.dataKey === 'ror')?.value || 0;

                      // Find top tickers for this month
                      const monthDate = new Date(month + ' 1');
                      const topTickers = getTopTickersForMonth(monthDate.getFullYear(), monthDate.getMonth());

                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-popover-foreground mb-2">{month}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-600 dark:text-emerald-400">P&L:</span>
                              <span className="font-medium">${pnlValue}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sky-600 dark:text-sky-400">RoR:</span>
                              <span className="font-medium">{rorValue}%</span>
                            </div>
                            {topTickers && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Top by P&L:</span>
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{topTickers.topByPnL.ticker}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Top by RoR:</span>
                                  <span className="font-medium text-sky-600 dark:text-sky-400">{topTickers.topByRoR.ticker}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'hsl(var(--card-foreground))' }}
                />
                <Bar
                  yAxisId="pnl"
                  dataKey="pnl"
                  fill="hsl(160 60% 40%)"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name="P&L ($)"
                />
                <Bar
                  yAxisId="ror"
                  dataKey="ror"
                  fill="hsl(210 60% 55%)"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name="RoR (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-6 text-center py-4 text-muted-foreground">
            <p>No chart data available for {yearData.year}</p>
          </div>
        );
      })()}

      {/* Monthly Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Month</th>
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Trades</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Avg Days</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Win Rate</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top Strategy</th>}
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top by P&L</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top by RoR</th>
              {!isMobile && (
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  <div className="flex flex-col">
                    <span>P&L / Capital</span>
                    <span className="text-xs">RoR / Ann. RoR</span>
                  </div>
                </th>
              )}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fees</th>}
            </tr>
          </thead>
          <tbody className="bg-card">
            {yearData.monthlyBreakdown.map((month) => {
              const topTickers = getTopTickersForMonth(yearData.year, month.month);
              const isExpanded = expandedMonths.has(month.month);
              const monthTransactions = getMonthTransactions(month.month);
              const hasTransactions = monthTransactions.length > 0;

              // Calculate additional metrics for this month
              const realizedMonthTransactions = getRealizedTransactions(monthTransactions);
              const totalCollateral = realizedMonthTransactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
              const avgRoR = calculatePortfolioRoR(monthTransactions);
              const avgAnnualizedRoR = calculateMonthlyPortfolioAnnualizedRoR(monthTransactions);
              const avgDays = realizedMonthTransactions.length > 0
                ? realizedMonthTransactions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0) / realizedMonthTransactions.length
                : 0;
              const monthStrategyPerformance = calculateStrategyPerformance(realizedMonthTransactions, chains);
              const bestStrategy = monthStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
                ? monthStrategyPerformance.filter(s => s.realizedCount > 0)[0]
                : null;

              return (
                <React.Fragment key={month.month}>
                  <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-sm font-medium text-card-foreground">
                      <div className="flex items-center gap-2">
                        {hasTransactions && (
                          <button
                            onClick={() => toggleMonth(month.month)}
                            className="p-0.5 hover:bg-muted rounded transition-colors"
                            title={isExpanded ? 'Collapse trades' : 'Expand trades'}
                          >
                            {isExpanded ? (
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <span>{month.monthName}</span>
                      </div>
                    </td>
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{month.totalTrades}</td>}
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{Math.round(avgDays)}</td>}
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{Math.round(month.winRate)}%</td>}
                    {!isMobile && (
                      <td className="px-4 py-2 text-sm">
                        {bestStrategy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                            {bestStrategy.strategy} ({bestStrategy.avgRoR.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm">
                      {topTickers ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200">
                          {topTickers.topByPnL.ticker} ({formatCurrency(topTickers.topByPnL.pnl)})
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {topTickers ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200">
                          {topTickers.topByRoR.ticker} ({topTickers.topByRoR.ror.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    {!isMobile && (
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs">
                            <span className={`${month.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(month.totalPnL)}
                            </span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-red-600 dark:text-red-400">
                              {formatCurrency(totalCollateral)}
                            </span>
                          </span>
                          <span className="text-xs flex items-center space-x-1">
                            <RegularRoRTooltip
                              displayValue={avgRoR}
                              preciseValue={avgRoR}
                              size="sm"
                            />
                            <span className="text-muted-foreground"> / </span>
                            <AnnualizedRoRTooltip
                              displayValue={avgAnnualizedRoR}
                              preciseValue={avgAnnualizedRoR}
                              baseRoR={avgRoR}
                              context="monthly"
                              size="sm"
                            />
                          </span>
                        </div>
                      </td>
                    )}
                    {!isMobile && <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{formatCurrency(month.fees)}</td>}
                  </tr>

                  {/* Expanded trades table */}
                  {isExpanded && hasTransactions && (
                    <tr>
                      <td colSpan={isMobile ? 3 : 9} className="p-0">
                        <MonthlyTradesTable
                          transactions={monthTransactions}
                          chains={chains}
                          monthName={month.monthName}
                          selectedPortfolioName={selectedPortfolioName}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

