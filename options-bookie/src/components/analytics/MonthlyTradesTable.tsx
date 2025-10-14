import React from 'react';
import { OptionsTransaction } from '@/types/options';
import { calculateRoR, calculateDaysHeld, calculateCollateral, formatPnLCurrency, getRealizedTransactions, calculateStrategyPerformance } from '@/utils/optionsCalculations';
import { parseLocalDate } from '@/utils/dateUtils';
import { useIsMobile } from '@/hooks/useMediaQuery';
import MonthPortfolioAnalytics from './MonthPortfolioAnalytics';
import QuickStatsCard from './QuickStatsCard';
import StrategyPerformanceCard from './StrategyPerformanceCard';

interface MonthlyTradesTableProps {
  transactions: OptionsTransaction[];
  monthName: string;
  selectedPortfolioName?: string | null;
}

export default function MonthlyTradesTable({ transactions, monthName, selectedPortfolioName }: MonthlyTradesTableProps) {
  const isMobile = useIsMobile();
  const formatCurrency = formatPnLCurrency;

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
      {/* Month-specific Quick Stats and Strategy Performance */}
      <MonthPortfolioAnalytics month={monthName} selectedPortfolioName={selectedPortfolioName}>
        <QuickStatsCard {...quickStatsData} />
        <StrategyPerformanceCard strategyPerformance={monthStrategyPerformance} />
      </MonthPortfolioAnalytics>

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
                    {formatCurrency(pnl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      <div className="mt-3 pt-2 border-t border-border/50 text-xs">
        {isMobile ? (
          // Mobile: Vertical stack layout
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium text-card-foreground">
                {transactions.length} trade{transactions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Days:</span>
              <span className="font-medium text-card-foreground">
                {Math.round(transactions.reduce((sum, t) =>
                  sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0
                ) / transactions.length)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capital Deployed:</span>
              <span className="font-medium text-card-foreground">
                {formatCurrency(transactions.reduce((sum, t) => sum + calculateCollateral(t), 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg RoR:</span>
              <span className={`font-medium ${
                (() => {
                  // Use Portfolio RoR calculation (same as chart) for consistency
                  const totalPnL = transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
                  const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                  const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                  return portfolioRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                })()
              }`}>
                {(() => {
                  // Use Portfolio RoR calculation (same as chart) for consistency
                  const totalPnL = transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
                  const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                  const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                  return isFinite(portfolioRoR) ? `${portfolioRoR.toFixed(1)}%` : '-';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total P&L:</span>
              <span className={`font-medium ${
                transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0))}
              </span>
            </div>
          </div>
        ) : (
          // Desktop: Horizontal layout (original)
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              Total: {transactions.length} trade{transactions.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-4">
              <span className="text-muted-foreground">
                Avg Days: <span className="font-medium text-card-foreground">
                  {Math.round(transactions.reduce((sum, t) =>
                    sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0
                  ) / transactions.length)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Capital Deployed: <span className="font-medium text-card-foreground">
                  {formatCurrency(transactions.reduce((sum, t) => sum + calculateCollateral(t), 0))}
                </span>
              </span>
              <span className="text-muted-foreground">
                Avg RoR: <span className={`font-medium ${
                  (() => {
                    // Use Portfolio RoR calculation (same as chart) for consistency
                    const totalPnL = transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return portfolioRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
                  })()
                }`}>
                  {(() => {
                    // Use Portfolio RoR calculation (same as chart) for consistency
                    const totalPnL = transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
                    const totalCollateral = transactions.reduce((sum, t) => sum + calculateCollateral(t), 0);
                    const portfolioRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
                    return isFinite(portfolioRoR) ? `${portfolioRoR.toFixed(1)}%` : '-';
                  })()}
                </span>
              </span>
              <span className="text-muted-foreground">
                Total P&L: <span className={`font-medium ${
                  transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(transactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0))}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
