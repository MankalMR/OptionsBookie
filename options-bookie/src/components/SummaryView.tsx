'use client';

import { OptionsTransaction } from '@/types/options';
import { calculateDaysHeld, getRealizedTransactions, calculateTotalRealizedPnL, formatPnLCurrency, calculateStrategyPerformance, calculateMonthlyChartData } from '@/utils/optionsCalculations';
import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';

interface SummaryViewProps {
  transactions: OptionsTransaction[];
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

interface MonthlySummary {
  year: number;
  month: number;
  monthName: string;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalFees: number;
  averageDaysHeld: number;
}

export default function SummaryView({ transactions }: SummaryViewProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);


  const yearlySummaries = useMemo(() => {
    // Use centralized utility for truly completed transactions only
    const completedTransactions = getRealizedTransactions(transactions).filter(t =>
      t.closeDate // Only include transactions with actual close dates
    );

    const yearlyData: Record<number, YearlySummary> = {};

    completedTransactions.forEach(transaction => {
      // For rolled transactions, use current date if no closeDate is set
      const closeDate = transaction.closeDate
        ? new Date(transaction.closeDate)
        : new Date(); // Use current date for rolled transactions
      const year = closeDate.getFullYear();
      const month = closeDate.getMonth();

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

      const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate);

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
          const transactionCloseDate = t.closeDate ? new Date(t.closeDate) : new Date();
          return transactionCloseDate.getFullYear() === yearData.year;
        })
        .forEach(transaction => {
          const closeDate = transaction.closeDate
            ? new Date(transaction.closeDate)
            : new Date();
          const month = closeDate.getMonth();
          const monthName = closeDate.toLocaleString('default', { month: 'long' });

          if (!monthlyData[month]) {
            monthlyData[month] = {
              year: yearData.year,
              month,
              monthName,
              totalPnL: 0,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
              winRate: 0,
              totalFees: 0,
              averageDaysHeld: 0
            };
          }

          const pnl = transaction.profitLoss || 0;
          const fees = transaction.fees || 0;
          const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate);

          monthlyData[month].totalPnL += pnl;
          monthlyData[month].totalTrades += 1;
          monthlyData[month].totalFees += fees;
          monthlyData[month].averageDaysHeld += daysHeld;

          if (pnl > 0) {
            monthlyData[month].winningTrades += 1;
          } else if (pnl < 0) {
            monthlyData[month].losingTrades += 1;
          }
        });

      // Calculate monthly win rates and averages
      Object.values(monthlyData).forEach(monthData => {
        monthData.winRate = monthData.totalTrades > 0 ? (monthData.winningTrades / monthData.totalTrades) * 100 : 0;
        monthData.averageDaysHeld = monthData.totalTrades > 0 ? monthData.averageDaysHeld / monthData.totalTrades : 0;
      });

      yearData.monthlyBreakdown = Object.values(monthlyData).sort((a, b) => b.month - a.month);

      // Find best and worst months
      if (yearData.monthlyBreakdown.length > 0) {
        yearData.bestMonth = yearData.monthlyBreakdown.reduce((best, month) =>
          month.totalPnL > best.pnl ? { month: month.monthName, pnl: month.totalPnL } : best,
          { month: '', pnl: -Infinity }
        );
        yearData.worstMonth = yearData.monthlyBreakdown.reduce((worst, month) =>
          month.totalPnL < worst.pnl ? { month: month.monthName, pnl: month.totalPnL } : worst,
          { month: '', pnl: Infinity }
        );
      }
    });

    return Object.values(yearlyData).sort((a, b) => b.year - a.year);
  }, [transactions]);

  const overallStats = useMemo(() => {
    // Use centralized utilities for realized transactions and P&L calculation
    const realizedTransactions = getRealizedTransactions(transactions);
    const totalPnL = calculateTotalRealizedPnL(transactions);
    const totalTrades = realizedTransactions.length;
    const winningTrades = realizedTransactions.filter(t => (t.profitLoss || 0) > 0).length;
    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

    // For average days held, use all realized transactions
    const completedTransactions = realizedTransactions;

    return {
      totalPnL,
      totalTrades,
      winningTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalFees,
      averageDaysHeld: completedTransactions.length > 0
        ? completedTransactions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate), 0) / completedTransactions.length
        : 0
    };
  }, [transactions]);

  // Use centralized formatting utility
  const formatCurrency = formatPnLCurrency;

  // Calculate strategy performance analytics
  const strategyPerformance = useMemo(() => calculateStrategyPerformance(transactions), [transactions]);

  // Calculate monthly chart data
  const monthlyChartData = useMemo(() => calculateMonthlyChartData(transactions), [transactions]);

  // Filter monthly chart data for a specific year
  const getYearlyChartData = (year: number) => {
    return monthlyChartData.filter(data => {
      // Parse year from month string like "Sep 2025"
      const yearMatch = data.month.match(/(\d{4})/);
      const monthYear = yearMatch ? parseInt(yearMatch[1]) : 0;
      return monthYear === year;
    });
  };

  const selectedYearData = selectedYear ? yearlySummaries.find(y => y.year === selectedYear) : null;

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-card-foreground">No trading data available</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add some trades to see your performance analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p className={`text-3xl font-bold ${overallStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(overallStats.totalPnL)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-3xl font-bold text-card-foreground">{overallStats.totalTrades}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-3xl font-bold text-card-foreground">{Math.round(overallStats.winRate)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Avg RoR</p>
            <p className={`text-3xl font-bold ${
              strategyPerformance.length > 0 && strategyPerformance.reduce((sum, s) => sum + s.avgRoR, 0) / strategyPerformance.length >= 0
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {strategyPerformance.length > 0
                ? (strategyPerformance.reduce((sum, s) => sum + s.avgRoR, 0) / strategyPerformance.length).toFixed(1)
                : '0.0'
              }%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Best Strategy</p>
            <p className="text-lg font-bold text-blue-600">
              {strategyPerformance.length > 0 ? strategyPerformance[0].strategy : 'N/A'}
            </p>
            {strategyPerformance.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {strategyPerformance[0].avgRoR.toFixed(1)}% RoR
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Fees</p>
            <p className="text-3xl font-bold text-card-foreground">{formatCurrency(overallStats.totalFees)}</p>
          </div>
        </div>
      </div>

      {/* Strategy Performance Comparison */}
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Strategy Performance</h2>
        {strategyPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg RoR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avg Capital
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {strategyPerformance.map((strategy, index) => (
                  <tr key={strategy.strategy} className={index % 2 === 0 ? 'bg-muted/20' : 'bg-card'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                      {strategy.strategy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{strategy.tradeCount}</span>
                        <span className="text-xs text-muted-foreground">
                          ({strategy.openCount} open, {strategy.realizedCount} realized)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        strategy.avgRoR >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {strategy.avgRoR.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        strategy.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(strategy.totalPnL)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      {strategy.winRate.toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      {Math.round(strategy.avgDaysHeld)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatCurrency(strategy.avgCollateral)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No completed trades available for strategy analysis.</p>
          </div>
        )}
      </div>

      {/* Yearly Performance */}
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Yearly Performance</h2>
        <div className="space-y-4">
          {yearlySummaries.map((yearData) => (
            <div key={yearData.year} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-card-foreground">{yearData.year}</h3>
                <button
                  onClick={() => setSelectedYear(selectedYear === yearData.year ? null : yearData.year)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {selectedYear === yearData.year ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={`text-lg font-semibold ${yearData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-lg font-medium text-card-foreground mb-4">Monthly Breakdown</h4>

                  {/* Monthly Performance Chart for Selected Year */}
                  {(() => {
                    const yearChartData = getYearlyChartData(yearData.year);
                    return yearChartData.length > 0 ? (
                      <div className="mb-6">
                        <ResponsiveContainer width="100%" height={350}>
                          <ComposedChart data={yearChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 12, fill: 'currentColor' }}
                              className="text-muted-foreground"
                            />
                            <YAxis
                              yAxisId="pnl"
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
                              formatter={(value: number, name: string) => [
                                name === 'pnl' ? `$${value}` : `${value}%`,
                                name === 'pnl' ? 'P&L' : 'RoR'
                              ]}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))'
                              }}
                            />
                            <Legend
                              wrapperStyle={{ color: 'hsl(var(--card-foreground))' }}
                            />
                            <Bar
                              yAxisId="pnl"
                              dataKey="pnl"
                              fill="hsl(142 76% 36%)"
                              fillOpacity={0.8}
                              radius={[4, 4, 0, 0]}
                              name="P&L ($)"
                            />
                            <Bar
                              yAxisId="ror"
                              dataKey="ror"
                              fill="hsl(221 83% 53%)"
                              fillOpacity={0.8}
                              radius={[4, 4, 0, 0]}
                              name="RoR (%)"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null;
                  })()}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Month</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">P&L</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Trades</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Win Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fees</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {yearData.monthlyBreakdown.map((month) => (
                          <tr key={month.month}>
                            <td className="px-4 py-2 text-sm font-medium text-card-foreground">{month.monthName}</td>
                            <td className={`px-4 py-2 text-sm ${month.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(month.totalPnL)}
                            </td>
                            <td className="px-4 py-2 text-sm text-card-foreground">{month.totalTrades}</td>
                            <td className="px-4 py-2 text-sm text-card-foreground">{Math.round(month.winRate)}%</td>
                            <td className="px-4 py-2 text-sm text-card-foreground">{formatCurrency(month.totalFees)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">Best Month</p>
                      <p className="text-lg font-semibold text-green-900">
                        {yearData.bestMonth.month}: {formatCurrency(yearData.bestMonth.pnl)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">Worst Month</p>
                      <p className="text-lg font-semibold text-red-900">
                        {yearData.worstMonth.month}: {formatCurrency(yearData.worstMonth.pnl)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Performance Insights */}
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Best Performing Year</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.totalPnL > best.totalPnL ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">Highest Win Rate Year</p>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.winRate > best.winRate ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">Most Active Year</p>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
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
