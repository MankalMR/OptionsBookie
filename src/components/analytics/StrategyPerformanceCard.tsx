'use client';

import { formatPnLCurrency, getRealizedTransactions, calculateAnnualizedRoR } from '@/utils/optionsCalculations';
import { RegularRoRTooltip, AnnualizedRoRTooltip } from '@/components/ui/RoRTooltip';

interface StrategyData {
  strategy: string;
  tradeCount: number;
  openCount: number;
  realizedCount: number;
  avgRoR: number;
  avgAnnualizedRoR: number;
  totalPnL: number;
  winRate: number;
  avgDaysHeld: number;
  avgCollateral: number;
}

interface StrategyPerformanceCardProps {
  strategyPerformance: StrategyData[];
}

export default function StrategyPerformanceCard({ strategyPerformance }: StrategyPerformanceCardProps) {
  const formatCurrency = formatPnLCurrency;

  if (strategyPerformance.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow border p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-6">Strategy Performance</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No strategy data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 rounded-lg border p-6">
      <h3 className="text-xl font-bold text-card-foreground mb-6">Strategy Performance</h3>
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
                <div className="flex flex-col">
                  <span>Avg RoR</span>
                  <span className="text-xs">Ann. RoR</span>
                </div>
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
                  <div className="flex flex-col space-y-1">
                    <RegularRoRTooltip
                      displayValue={strategy.avgRoR}
                      preciseValue={strategy.avgRoR}
                      size="sm"
                    />
                    <AnnualizedRoRTooltip
                      displayValue={strategy.avgAnnualizedRoR}
                      preciseValue={strategy.avgAnnualizedRoR}
                      baseRoR={strategy.avgRoR}
                      context="yearly"
                      calculationMethod="trade-weighted"
                      size="sm"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${
                    strategy.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(strategy.totalPnL)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                  {Math.round(strategy.winRate)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                  {Math.round(strategy.avgDaysHeld)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                  {formatCurrency(strategy.avgCollateral)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
