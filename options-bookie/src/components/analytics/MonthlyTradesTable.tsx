import React from 'react';
import { OptionsTransaction } from '@/types/options';
import { calculateRoR, calculateDaysHeld, calculateCollateral, formatPnLCurrency, getRealizedTransactions, calculateStrategyPerformance } from '@/utils/optionsCalculations';
import { parseLocalDate } from '@/utils/dateUtils';
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
    avgRoR: monthStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? monthStrategyPerformance.filter(s => s.realizedCount > 0).reduce((sum, s) => sum + s.avgRoR, 0) / monthStrategyPerformance.filter(s => s.realizedCount > 0).length
      : 0,
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
        <table className="min-w-full text-xs table-fixed">
          <colgroup>
            {isMobile ? (
              <>
                <col className="w-[40%]" />  {/* Symbol (Contracts) */}
                <col className="w-[30%]" />  {/* RoR */}
                <col className="w-[30%]" />  {/* P&L */}
              </>
            ) : (
              <>
                <col className="w-[15%]" />  {/* Symbol (Contracts) */}
                <col className="w-[10%]" />  {/* Strike Price */}
                <col className="w-[12%]" />  {/* Type */}
                <col className="w-[10%]" />  {/* Opened */}
                <col className="w-[10%]" />  {/* Closed */}
                <col className="w-[8%]" />   {/* Days Held */}
                <col className="w-[12%]" />  {/* Status */}
                <col className="w-[10%]" />  {/* RoR */}
                <col className="w-[13%]" />  {/* P&L */}
              </>
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Symbol (Contracts)</th>
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Strike Price</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Opened</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Closed</th>}
              {!isMobile && <th className="text-center py-2 px-3 font-medium text-muted-foreground">Days Held</th>}
              {!isMobile && <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>}
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">RoR</th>
              <th className="text-right py-2 pl-3 font-medium text-muted-foreground">P&L</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction) => {
              const ror = calculateRoR(transaction);
              const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate!);
              const pnl = transaction.profitLoss || 0;

              return (
                <tr key={transaction.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-2 pr-3 font-medium text-card-foreground truncate">
                    {transaction.stockSymbol} ({transaction.numberOfContracts})
                  </td>
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground truncate">
                      ${transaction.strikePrice}
                    </td>
                  )}
                  {!isMobile && (
                    <td className="py-2 px-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          transaction.callOrPut === 'Call' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                        <span className="truncate">{transaction.buyOrSell} {transaction.callOrPut}</span>
                      </span>
                    </td>
                  )}
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
                  <td className={`py-2 px-3 text-right font-medium truncate ${
                    ror >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isFinite(ror) ? `${ror.toFixed(1)}%` : '-'}
                  </td>
                  <td className={`py-2 pl-3 text-right font-medium truncate ${
                    pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatPnLCurrency(pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Summary Card */}
      <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-700/50 p-4 mt-4">

        {isMobile ? (
          // Mobile: Vertical layout with sections
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
                <p className={`text-base font-medium ${
                  totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPnLCurrency(totalPnL)}
                </p>
                <p className="text-xs text-muted-foreground">Total P&L</p>
              </div>
              <div className="text-center">
                <p className={`text-base font-medium ${
                  (() => {
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return portfolioRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                  })()
                }`}>
                  {(() => {
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return isFinite(portfolioRoR) ? `${portfolioRoR.toFixed(1)}%` : '-';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Avg RoR</p>
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
        ) : (
          // Desktop: Grid layout
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Performance Section */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Performance</p>
              <div className="space-y-1">
                <p className="text-base font-medium text-card-foreground">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Trades</p>
                <p className="text-base font-medium text-card-foreground">{Math.round(winRate)}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>

            {/* P&L & Returns Section */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">P&L & Returns</p>
              <div className="space-y-1">
                <p className={`text-base font-medium ${
                  totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPnLCurrency(totalPnL)}
                </p>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`text-base font-medium ${
                  (() => {
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return portfolioRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                  })()
                }`}>
                  {(() => {
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return isFinite(portfolioRoR) ? `${portfolioRoR.toFixed(1)}%` : '-';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Avg RoR</p>
              </div>
            </div>

            {/* Capital & Time Section */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Capital & Time</p>
              <div className="space-y-1">
                <p className="text-base font-medium text-orange-600">
                  {formatPnLCurrency(transactions.reduce((sum, t) => sum + calculateCollateral(t), 0))}
                </p>
                <p className="text-xs text-muted-foreground">Capital Deployed</p>
                <p className="text-base font-medium text-card-foreground">
                  {Math.round(transactions.reduce((sum, t) =>
                    sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0
                  ) / transactions.length)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Days</p>
              </div>
            </div>

            {/* Best Performance Section */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Best Performance</p>
              <div className="space-y-1">
                {quickStatsData.bestStrategy ? (
                  <>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                      {quickStatsData.bestStrategy.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quickStatsData.bestStrategy.ror.toFixed(1)}% RoR
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
                {quickStatsData.bestStockByPnL ? (
                  <>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {quickStatsData.bestStockByPnL.ticker}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPnLCurrency(quickStatsData.bestStockByPnL.pnl)} P&L
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
