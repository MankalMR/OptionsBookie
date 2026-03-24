import { OptionsTransaction, AIFilterSchema } from '@/types/options';

// Extracted from TransactionsTable for testing purposes
export function applyAiFilter(transactions: OptionsTransaction[], aiFilters: AIFilterSchema, getDisplayPnL: (t: OptionsTransaction) => number): OptionsTransaction[] {
  return transactions.filter((t) => {
    if (aiFilters.symbol && t.stockSymbol.toLowerCase() !== aiFilters.symbol.toLowerCase()) {
      return false;
    }
    if (aiFilters.type && t.callOrPut !== aiFilters.type) {
      return false;
    }
    if (aiFilters.action && t.buyOrSell !== aiFilters.action) {
      return false;
    }
    if (aiFilters.outcome) {
      const pnl = getDisplayPnL(t);
      if (aiFilters.outcome === 'win' && pnl <= 0) return false;
      if (aiFilters.outcome === 'loss' && pnl >= 0) return false;
    }
    return true;
  });
}
