'use client';

import { OptionsTransaction, TradeChain } from '@/types/options';
import { calculateUnrealizedPnL, calculateDaysHeld, getRealizedTransactions, calculateTotalRealizedPnL } from '@/utils/optionsCalculations';
import PnLDisplay from '@/components/PnLDisplay';
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
    <div className="bg-card rounded-lg shadow border p-6">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Portfolio Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Open Positions</p>
          <p className="text-2xl font-bold text-blue-600">{summary.totalOpenPositions}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Realized Positions</p>
          <p className="text-2xl font-bold text-card-foreground">{summary.totalClosedPositions}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Realized P&L</p>
          <PnLDisplay
            amount={summary.totalProfitLoss}
            textSize="2xl"
            iconSize="lg"
            className="font-bold"
            showZero
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Unrealized P&L</p>
          <PnLDisplay
            amount={summary.unrealizedPnL}
            textSize="2xl"
            iconSize="lg"
            className="font-bold"
            showZero
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold text-card-foreground">{Math.round(summary.winRate)}%</p>
        </div>
      </div>
    </div>
  );
}
