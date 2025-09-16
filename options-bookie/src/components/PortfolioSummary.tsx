'use client';

import { OptionsTransaction, TradeChain } from '@/types/options';
import { calculateUnrealizedPnL, calculateDaysHeld, getRealizedTransactions, calculateTotalRealizedPnL, formatPnLNumber } from '@/utils/optionsCalculations';
import { useMemo } from 'react';

interface PortfolioSummaryProps {
  transactions: OptionsTransaction[];
  chains?: TradeChain[];
}

export default function PortfolioSummary({ transactions, chains = [] }: PortfolioSummaryProps) {
  const summary = useMemo(() => {
    const openPositions = transactions.filter(t => t.status === 'Open');
    const rolledPositions = transactions.filter(t => t.status === 'Rolled');

    // Use centralized utility for realized transactions and P&L calculation
    const realizedPositions = getRealizedTransactions(transactions);
    const totalProfitLoss = calculateTotalRealizedPnL(transactions);

    // Calculate unrealized P&L using chain-aware logic
    const unrealizedPnL = calculateUnrealizedPnL(transactions, chains);

    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

    const winningTrades = realizedPositions.filter(t => (t.profitLoss || 0) > 0);
    const winRate = realizedPositions.length > 0 ? (winningTrades.length / realizedPositions.length) * 100 : 0;

    const averageDaysHeld = realizedPositions.length > 0
      ? realizedPositions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate), 0) / realizedPositions.length
      : 0;

    return {
      totalOpenPositions: openPositions.length + rolledPositions.length,
      totalClosedPositions: realizedPositions.length,
      totalProfitLoss,
      unrealizedPnL,
      totalFees,
      winRate,
      averageDaysHeld
    };
  }, [transactions, chains]);

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
            {formatPnLNumber(summary.totalProfitLoss)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Unrealized P&L</p>
          <p className={`text-2xl font-bold ${summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPnLNumber(summary.unrealizedPnL)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(summary.winRate)}%</p>
        </div>
      </div>
    </div>
  );
}
