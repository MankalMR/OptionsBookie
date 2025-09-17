'use client';

import { OptionsTransaction, TradeChain } from '@/types/options';
import { calculateUnrealizedPnL, calculateDaysHeld, getRealizedTransactions, calculateTotalRealizedPnL, calculateTotalDeployedCapital, calculateAverageRoR } from '@/utils/optionsCalculations';
import PnLDisplay from '@/components/PnLDisplay';
import { useMemo } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface PortfolioSummaryProps {
  transactions: OptionsTransaction[];
  chains?: TradeChain[];
}

export default function PortfolioSummary({ transactions, chains = [] }: PortfolioSummaryProps) {
  const isMobile = useIsMobile();

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

    // Calculate new capital deployment metrics
    const totalDeployedCapital = calculateTotalDeployedCapital(transactions);
    const averageRoR = calculateAverageRoR(transactions);

    return {
      totalOpenPositions: openPositions.length + rolledPositions.length,
      totalClosedPositions: realizedPositions.length,
      totalProfitLoss,
      unrealizedPnL,
      totalFees,
      winRate,
      averageDaysHeld,
      totalDeployedCapital,
      averageRoR
    };
  }, [transactions, chains]);

  if (isMobile) {
    // Simplified mobile layout
    return (
      <div className="bg-card rounded-lg shadow border p-4">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Portfolio Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Positions</p>
            <div className="flex space-x-4 justify-center">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{summary.totalOpenPositions}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-card-foreground">{summary.totalClosedPositions}</p>
                <p className="text-xs text-muted-foreground">Realized</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">P&L</p>
            <div className="flex space-x-4 justify-center">
              <div className="text-center">
                <PnLDisplay
                  amount={summary.totalProfitLoss}
                  textSize="xl"
                  iconSize="md"
                  className="font-bold justify-center"
                  showZero
                />
                <p className="text-xs text-muted-foreground">Realized</p>
              </div>
              <div className="text-center">
                <PnLDisplay
                  amount={summary.unrealizedPnL}
                  textSize="xl"
                  iconSize="md"
                  className="font-bold justify-center"
                  showZero
                />
                <p className="text-xs text-muted-foreground">Unrealized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Portfolio Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Positions</p>
          <div className="flex space-x-6 justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.totalOpenPositions}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-card-foreground">{summary.totalClosedPositions}</p>
              <p className="text-xs text-muted-foreground">Realized</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">P&L</p>
          <div className="flex space-x-6 justify-center">
            <div className="text-center">
              <PnLDisplay
                amount={summary.totalProfitLoss}
                textSize="2xl"
                iconSize="lg"
                className="font-bold justify-center"
                showZero
              />
              <p className="text-xs text-muted-foreground">Realized</p>
            </div>
            <div className="text-center">
              <PnLDisplay
                amount={summary.unrealizedPnL}
                textSize="2xl"
                iconSize="lg"
                className="font-bold justify-center"
                showZero
              />
              <p className="text-xs text-muted-foreground">Unrealized</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Capital & RoR</p>
          <div className="flex space-x-6 justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                ${Math.round(summary.totalDeployedCapital).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Deployed Capital</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                summary.averageRoR >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.averageRoR.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg RoR</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold text-card-foreground">{Math.round(summary.winRate)}%</p>
        </div>
      </div>
    </div>
  );
}
