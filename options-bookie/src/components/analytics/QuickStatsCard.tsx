'use client';

import { formatPnLCurrency } from '@/utils/optionsCalculations';

interface QuickStatsCardProps {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  avgRoR: number;
  bestStrategy: {
    name: string;
    ror: number;
  } | null;
  totalFees: number;
}

export default function QuickStatsCard({
  totalPnL,
  totalTrades,
  winRate,
  avgRoR,
  bestStrategy,
  totalFees
}: QuickStatsCardProps) {
  const formatCurrency = formatPnLCurrency;

  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <h2 className="text-2xl font-bold text-card-foreground mb-6">Quick Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalPnL)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Trades</p>
          <p className="text-3xl font-bold text-card-foreground">{totalTrades}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-3xl font-bold text-card-foreground">{Math.round(winRate)}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Avg RoR</p>
          <p className={`text-3xl font-bold ${
            avgRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {avgRoR.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Best Strategy</p>
          <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
            {bestStrategy?.name || 'N/A'}
          </p>
          {bestStrategy && (
            <p className="text-xs text-muted-foreground">
              {bestStrategy.ror.toFixed(1)}% RoR
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Fees</p>
          <p className="text-3xl font-bold text-card-foreground">{formatCurrency(totalFees)}</p>
        </div>
      </div>
    </div>
  );
}
