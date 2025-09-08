'use client';

import { OptionsTransaction } from '@/types/options';
import { useMemo } from 'react';

interface PortfolioSummaryProps {
  transactions: OptionsTransaction[];
}

export default function PortfolioSummary({ transactions }: PortfolioSummaryProps) {
  const summary = useMemo(() => {
    const openPositions = transactions.filter(t => t.status === 'Open');
    const closedPositions = transactions.filter(t => t.status === 'Closed');

    const totalProfitLoss = closedPositions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

    const winningTrades = closedPositions.filter(t => (t.profitLoss || 0) > 0);
    const winRate = closedPositions.length > 0 ? (winningTrades.length / closedPositions.length) * 100 : 0;

    const averageDaysHeld = closedPositions.length > 0
      ? closedPositions.reduce((sum, t) => sum + (t.daysHeld || 0), 0) / closedPositions.length
      : 0;

    // Calculate monthly P&L
    const monthlyPnL = transactions.reduce((acc, transaction) => {
      if (transaction.status === 'Closed' && transaction.closeDate) {
        const date = new Date(transaction.closeDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;

        if (!acc[key]) {
          acc[key] = {
            year,
            month,
            monthName: date.toLocaleString('default', { month: 'long' }),
            profitLoss: 0,
            numberOfTrades: 0,
            winRate: 0
          };
        }

        acc[key].profitLoss += transaction.profitLoss || 0;
        acc[key].numberOfTrades += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate win rate for each month
    Object.values(monthlyPnL).forEach(month => {
      const monthTransactions = transactions.filter(t =>
        t.status === 'Closed' &&
        t.closeDate &&
        new Date(t.closeDate).getFullYear() === month.year &&
        new Date(t.closeDate).getMonth() === month.month
      );
      const winningTrades = monthTransactions.filter(t => (t.profitLoss || 0) > 0);
      month.winRate = monthTransactions.length > 0 ? (winningTrades.length / monthTransactions.length) * 100 : 0;
    });

    return {
      totalOpenPositions: openPositions.length,
      totalClosedPositions: closedPositions.length,
      totalProfitLoss,
      totalFees,
      winRate,
      averageDaysHeld,
      monthlyPnL: Object.values(monthlyPnL).sort((a, b) => b.year - a.year || b.month - a.month)
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Open Positions</p>
            <p className="text-2xl font-bold text-blue-600">{summary.totalOpenPositions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Closed Positions</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalClosedPositions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total P&L</p>
            <p className={`text-2xl font-bold ${summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${summary.totalProfitLoss.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900">{summary.winRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Monthly Performance */}
      {summary.monthlyPnL.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
          <div className="space-y-3">
            {summary.monthlyPnL.slice(0, 6).map((month, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{month.monthName} {month.year}</p>
                  <p className="text-sm text-gray-600">{month.numberOfTrades} trades</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${month.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${month.profitLoss.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">{month.winRate.toFixed(1)}% win rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Fees</span>
            <span className="font-medium">${summary.totalFees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Days Held</span>
            <span className="font-medium">{summary.averageDaysHeld.toFixed(1)} days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
