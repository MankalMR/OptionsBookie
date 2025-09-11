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
    const expiredPositions = transactions.filter(t => t.status === 'Expired');
    const assignedPositions = transactions.filter(t => t.status === 'Assigned');

    // All non-open positions contribute to total P&L
    const realizedPositions = [...closedPositions, ...expiredPositions, ...assignedPositions];

    const totalProfitLoss = realizedPositions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    // Calculate unrealized P&L as sum of P&L column for open trades
    const unrealizedPnL = openPositions.reduce((total, transaction) => {
      return total + (transaction.profitLoss || 0);
    }, 0);

    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

    const winningTrades = realizedPositions.filter(t => (t.profitLoss || 0) > 0);
    const winRate = realizedPositions.length > 0 ? (winningTrades.length / realizedPositions.length) * 100 : 0;

    const averageDaysHeld = realizedPositions.length > 0
      ? realizedPositions.reduce((sum, t) => sum + (t.daysHeld || 0), 0) / realizedPositions.length
      : 0;

    return {
      totalOpenPositions: openPositions.length,
      totalClosedPositions: realizedPositions.length,
      totalProfitLoss,
      unrealizedPnL,
      totalFees,
      winRate,
      averageDaysHeld
    };
  }, [transactions]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-sm text-gray-600">Open Positions</p>
          <p className="text-2xl font-bold text-blue-600">{summary.totalOpenPositions}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Realized Positions</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalClosedPositions}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Realized P&L</p>
          <p className={`text-2xl font-bold ${summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Unrealized P&L</p>
          <p className={`text-2xl font-bold ${summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.unrealizedPnL.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-2xl font-bold text-gray-900">{summary.winRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
