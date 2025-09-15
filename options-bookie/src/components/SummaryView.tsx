'use client';

import { OptionsTransaction } from '@/types/options';
import { calculateDaysHeld } from '@/utils/optionsCalculations';
import { useMemo, useState } from 'react';

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
    // Include both closed and rolled transactions for yearly summaries
    const completedTransactions = transactions.filter(t =>
      (t.status === 'Closed' || t.status === 'Rolled') &&
      (t.closeDate || t.status === 'Rolled') // Rolled trades might not have explicit closeDate
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
    const closedTransactions = transactions.filter(t => t.status === 'Closed');
    const rolledTransactions = transactions.filter(t => t.status === 'Rolled');

    // For P&L calculation, only use truly closed transactions
    const totalPnL = closedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalTrades = closedTransactions.length;
    const winningTrades = closedTransactions.filter(t => (t.profitLoss || 0) > 0).length;
    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

    // For average days held, include both closed and rolled transactions
    const completedTransactions = [...closedTransactions, ...rolledTransactions];

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const selectedYearData = selectedYear ? yearlySummaries.find(y => y.year === selectedYear) : null;

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No trading data available</h3>
          <p className="mt-1 text-sm text-gray-500">Add some trades to see your performance analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total P&L</p>
            <p className={`text-3xl font-bold ${overallStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(overallStats.totalPnL)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Trades</p>
            <p className="text-3xl font-bold text-gray-900">{overallStats.totalTrades}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Win Rate</p>
            <p className="text-3xl font-bold text-gray-900">{overallStats.winRate.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Fees</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overallStats.totalFees)}</p>
          </div>
        </div>
      </div>

      {/* Yearly Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Yearly Performance</h2>
        <div className="space-y-4">
          {yearlySummaries.map((yearData) => (
            <div key={yearData.year} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{yearData.year}</h3>
                <button
                  onClick={() => setSelectedYear(selectedYear === yearData.year ? null : yearData.year)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {selectedYear === yearData.year ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total P&L</p>
                  <p className={`text-lg font-semibold ${yearData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(yearData.totalPnL)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trades</p>
                  <p className="text-lg font-semibold text-gray-900">{yearData.totalTrades}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Win Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{yearData.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Days Held</p>
                  <p className="text-lg font-semibold text-gray-900">{yearData.averageDaysHeld.toFixed(1)}</p>
                </div>
              </div>

              {selectedYear === yearData.year && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trades</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fees</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {yearData.monthlyBreakdown.map((month) => (
                          <tr key={month.month}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{month.monthName}</td>
                            <td className={`px-4 py-2 text-sm ${month.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(month.totalPnL)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{month.totalTrades}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{month.winRate.toFixed(1)}%</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(month.totalFees)}</td>
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Best Performing Year</p>
            <p className="text-xl font-bold text-blue-900">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.totalPnL > best.totalPnL ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 font-medium">Highest Win Rate Year</p>
            <p className="text-xl font-bold text-green-900">
              {yearlySummaries.length > 0
                ? yearlySummaries.reduce((best, year) => year.winRate > best.winRate ? year : best).year
                : 'N/A'
              }
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800 font-medium">Most Active Year</p>
            <p className="text-xl font-bold text-purple-900">
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
