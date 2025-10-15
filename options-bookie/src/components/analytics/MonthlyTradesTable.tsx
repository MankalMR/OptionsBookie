import React from 'react';
import { OptionsTransaction } from '@/types/options';
import { calculateRoR, calculateDaysHeld, calculateCollateral, formatPnLCurrency, getRealizedTransactions, calculateStrategyPerformance, calculatePortfolioRoR, calculateAnnualizedRoR, calculatePortfolioAnnualizedRoR, getRoRColorClasses } from '@/utils/optionsCalculations';
import RoRDisplay from '@/components/ui/RoRDisplay';
import { parseLocalDate } from '@/utils/dateUtils';
import { formatStrikePrice } from '@/utils/formatUtils';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MonthlyTradesTableProps {
  transactions: OptionsTransaction[];
  monthName: string;
  selectedPortfolioName?: string | null;
}

export default function MonthlyTradesTable({ transactions, monthName, selectedPortfolioName }: MonthlyTradesTableProps) {
  const isMobile = useIsMobile();

  // Calculate month-specific metrics for Quick Stats
  const realizedTransactions = getRealizedTransactions(transactions);
  const totalPnL = realizedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  const winningTrades = realizedTransactions.filter(t => (t.profitLoss || 0) > 0);
  const winRate = realizedTransactions.length > 0 ? (winningTrades.length / realizedTransactions.length) * 100 : 0;

  // Calculate month-specific strategy performance
  const monthStrategyPerformance = calculateStrategyPerformance(transactions);

  // Calculate best stock by P&L and RoR for this month
  const stockPerformance = new Map<string, { pnl: number; trades: number; totalCollateral: number }>();
  realizedTransactions.forEach(t => {
    const symbol = t.stockSymbol;
    if (!stockPerformance.has(symbol)) {
      stockPerformance.set(symbol, { pnl: 0, trades: 0, totalCollateral: 0 });
    }
    const perf = stockPerformance.get(symbol)!;
    perf.pnl += t.profitLoss || 0;
    perf.trades += 1;
    perf.totalCollateral += calculateCollateral(t);
  });

  const bestStockByPnL = Array.from(stockPerformance.entries())
    .sort((a, b) => b[1].pnl - a[1].pnl)[0];

  const bestStockByRoR = Array.from(stockPerformance.entries())
    .map(([ticker, data]) => ({
      ticker,
      ror: data.totalCollateral > 0 ? (data.pnl / data.totalCollateral * 100) : 0
    }))
    .sort((a, b) => b.ror - a.ror)[0];

  const quickStatsData = {
    totalPnL,
    totalTrades: realizedTransactions.length,
    winRate,
    avgRoR: calculatePortfolioRoR(transactions),
    bestStrategy: monthStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: monthStrategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: monthStrategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStockByPnL ? { ticker: bestStockByPnL[0], pnl: bestStockByPnL[1].pnl } : null,
    bestStockByRoR: bestStockByRoR ? { ticker: bestStockByRoR.ticker, ror: bestStockByRoR.ror } : null
  };

  // Sort transactions by close date (most recent first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseLocalDate(a.closeDate!).getTime();
    const dateB = parseLocalDate(b.closeDate!).getTime();
    return dateB - dateA;
  });

  return (
    <div className="bg-muted/30 px-4 py-3 space-y-6">
      {/* Individual Trades Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Symbol (Contracts)</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Strike & Type</th>
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Opened</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Closed</th>}
              {!isMobile && <th className="text-center py-2 px-3 font-medium text-muted-foreground">Days Held</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>}
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                <div className="flex flex-col">
                  <span>P&L / Capital</span>
                  <span className="text-xs">RoR / Ann. RoR</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction) => {
              const ror = calculateRoR(transaction);
              const annualizedRoR = calculateAnnualizedRoR(transaction);
              const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate!);
              const pnl = transaction.profitLoss || 0;

              return (
                <tr key={transaction.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium text-card-foreground">
                    <div className="flex flex-col space-y-1">
                      <span className="truncate">{transaction.stockSymbol} ({transaction.numberOfContracts})</span>
                      <Badge
                        variant={transaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                        className={`text-xs px-1 py-0 w-fit text-xs ${transaction.buyOrSell === 'Buy'
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                          : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50'
                        }`}
                      >
                        {transaction.buyOrSell}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">${formatStrikePrice(transaction.strikePrice)}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                          ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                          : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                        }`}
                      >
                        {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                      </span>
                    </div>
                  </td>
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground truncate">
                      {parseLocalDate(transaction.tradeOpenDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground truncate">
                      {parseLocalDate(transaction.closeDate!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 text-center text-muted-foreground">
                      {daysHeld}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 truncate">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium truncate ${
                        transaction.status === 'Closed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                          : transaction.status === 'Expired'
                          ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                          : 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-medium">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs">
                        <span className={`${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatPnLCurrency(pnl)}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-600 dark:text-red-400">
                          {formatPnLCurrency(calculateCollateral(transaction))}
                        </span>
                      </span>
                      <span className="text-xs">
                        <span className={`${getRoRColorClasses(ror, annualizedRoR)}`}>
                          {isFinite(ror) ? `${ror.toFixed(1)}%` : '-'}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span className={`${getRoRColorClasses(ror, annualizedRoR)}`}>
                          {isFinite(annualizedRoR) ? `${annualizedRoR.toFixed(1)}%` : '-'}
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Summary Card - Only show on mobile */}
      {isMobile && (
        <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-700/50 p-4 mt-4">
          {/* Mobile: Vertical layout with sections */}
          <div className="space-y-4">
            {/* Basic Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-base font-medium text-card-foreground">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-card-foreground">{Math.round(winRate)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex flex-col">
                  <span className={`text-base font-bold ${
                    totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  } leading-tight`}>
                    {formatPnLCurrency(totalPnL)}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Total P&L
                  </div>
                </div>
              </div>
              <div className="text-center">
                <RoRDisplay
                  ror={(() => {
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    return totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                  })()}
                  annualizedRoR={calculatePortfolioAnnualizedRoR(transactions)}
                  size="base"
                  showLabel={true}
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">
                  {Math.round(transactions.reduce((sum, t) =>
                    sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0
                  ) / transactions.length)} days
                </p>
                <p className="text-xs text-muted-foreground">Avg Days</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">
                  {formatPnLCurrency(transactions.reduce((sum, t) => sum + calculateCollateral(t), 0))}
                </p>
                <p className="text-xs text-muted-foreground">Capital</p>
              </div>
            </div>

            {/* Best Performance */}
            {(quickStatsData.bestStrategy || quickStatsData.bestStockByPnL) && (
              <div className="border-t pt-4 space-y-2">
                {quickStatsData.bestStrategy && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Best Strategy</p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {quickStatsData.bestStrategy.name} ({quickStatsData.bestStrategy.ror.toFixed(1)}%)
                    </p>
                  </div>
                )}
                {quickStatsData.bestStockByPnL && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Top Stock</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {quickStatsData.bestStockByPnL.ticker} ({formatPnLCurrency(quickStatsData.bestStockByPnL.pnl)})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
