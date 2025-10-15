'use client';

import { formatPnLCurrency, getRoRColorClasses } from '@/utils/optionsCalculations';

interface QuickStatsCardProps {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  avgRoR: number;
  annualizedRoR: number;
  bestStrategy: {
    name: string;
    ror: number;
  } | null;
  bestStockByPnL: {
    ticker: string;
    pnl: number;
  } | null;
  bestStockByRoR: {
    ticker: string;
    ror: number;
  } | null;
}

export default function QuickStatsCard({
  totalPnL,
  totalTrades,
  winRate,
  avgRoR,
  annualizedRoR,
  bestStrategy,
  bestStockByPnL,
  bestStockByRoR
}: QuickStatsCardProps) {
  const formatCurrency = formatPnLCurrency;

  return (
    <div className="bg-muted/20 rounded-lg border p-6">
      <h3 className="text-xl font-bold text-card-foreground mb-6">Quick Stats</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Performance</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <span className="text-lg font-bold text-card-foreground">
              {totalTrades}
            </span>
            <span className="text-lg font-bold text-card-foreground">
              {Math.round(winRate)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs text-muted-foreground">
              Trades
            </div>
            <div className="text-xs text-muted-foreground">
              Win Rate
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">P&L & Returns</p>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="flex flex-col">
              <span className={`text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totalPnL)}
              </span>
              <div className="text-xs text-muted-foreground">
                Total P&L
              </div>
            </div>
            <div className="flex flex-col">
              <span className={`text-lg font-bold ${getRoRColorClasses(avgRoR)}`}>
                {avgRoR.toFixed(1)}%
              </span>
              <div className="text-xs text-muted-foreground">
                Avg RoR
              </div>
            </div>
            <div className="flex flex-col">
              <span className={`text-lg font-bold ${getRoRColorClasses(avgRoR, annualizedRoR)}`}>
                {isFinite(annualizedRoR) ? `${annualizedRoR.toFixed(1)}%` : '-'}
              </span>
              <div className="text-xs text-muted-foreground">
                Ann. RoR
              </div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Best Strategy</p>
          <div className="mt-1">
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
              {bestStrategy?.name || 'N/A'}
            </p>
            <div className="text-xs text-muted-foreground">
              {bestStrategy ? `${bestStrategy.ror.toFixed(1)}% RoR` : '-'}
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Best Stock</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {bestStockByPnL?.ticker || 'N/A'}
            </span>
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
              {bestStockByRoR?.ticker || 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs text-muted-foreground">
              {bestStockByPnL ? formatCurrency(bestStockByPnL.pnl) : '-'} P&L
            </div>
            <div className="text-xs text-muted-foreground">
              {bestStockByRoR ? `${bestStockByRoR.ror.toFixed(1)}%` : '-'} RoR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
