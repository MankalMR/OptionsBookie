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

    return {
      totalOpenPositions: openPositions.length,
      totalClosedPositions: closedPositions.length,
      totalProfitLoss,
      totalFees,
      winRate,
      averageDaysHeld
    };
  }, [transactions]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  );
}
