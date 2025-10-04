import React from 'react';
import { OptionsTransaction } from '@/types/options';
import { calculateRoR, calculateDaysHeld, calculateCollateral, formatPnLCurrency } from '@/utils/optionsCalculations';
import { parseLocalDate } from '@/utils/dateUtils';

interface MonthlyTradesTableProps {
  transactions: OptionsTransaction[];
  monthName: string;
}

export default function MonthlyTradesTable({ transactions, monthName }: MonthlyTradesTableProps) {
  const formatCurrency = formatPnLCurrency;

  // Sort transactions by close date (most recent first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseLocalDate(a.closeDate!).getTime();
    const dateB = parseLocalDate(b.closeDate!).getTime();
    return dateB - dateA;
  });

  return (
    <div className="bg-muted/30 px-4 py-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Symbol (Contracts)</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Strike Price</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Opened</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Closed</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Days Held</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
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
                  <td className="py-2 pr-3 font-medium text-card-foreground">
                    {transaction.stockSymbol} ({transaction.numberOfContracts})
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    ${transaction.strikePrice}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        transaction.callOrPut === 'Call' ? 'bg-blue-500' : 'bg-purple-500'
                      }`} />
                      {transaction.buyOrSell} {transaction.callOrPut}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {parseLocalDate(transaction.tradeOpenDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {parseLocalDate(transaction.closeDate!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-2 px-3 text-center text-muted-foreground">
                    {daysHeld}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      transaction.status === 'Closed'
                        ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                        : transaction.status === 'Expired'
                        ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200'
                        : 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className={`py-2 px-3 text-right font-medium ${
                    ror >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isFinite(ror) ? `${ror.toFixed(1)}%` : '-'}
                  </td>
                  <td className={`py-2 pl-3 text-right font-medium ${
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
      <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center text-xs">
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
            Avg RoR: <span className={`font-medium ${
              (() => {
                const rorValues = transactions.map(t => calculateRoR(t)).filter(ror => isFinite(ror));
                const avgRoR = rorValues.length > 0 ? rorValues.reduce((sum, ror) => sum + ror, 0) / rorValues.length : 0;
                return avgRoR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
              })()
            }`}>
              {(() => {
                const rorValues = transactions.map(t => calculateRoR(t)).filter(ror => isFinite(ror));
                const avgRoR = rorValues.length > 0 ? rorValues.reduce((sum, ror) => sum + ror, 0) / rorValues.length : 0;
                return isFinite(avgRoR) ? `${avgRoR.toFixed(1)}%` : '-';
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
    </div>
  );
}
