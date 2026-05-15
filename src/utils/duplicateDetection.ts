import { OptionsTransaction } from '@/types/options';

export type DeduplicationStatus = 'Clean' | 'ExactDuplicate' | 'PartialMatch' | 'LinkedToOpen';

export interface DeduplicatedTransaction extends Partial<OptionsTransaction> {
  dedupStatus: DeduplicationStatus;
  matchedTransactionIds?: string[];
  originalCsvRow?: Record<string, unknown>; // To help user debug if needed
}

const normalizeDate = (d: Date | string | undefined): number => {
    if (!d) return 0;
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

export const analyzeImport = (
  incoming: Partial<OptionsTransaction>[],
  existing: OptionsTransaction[]
): DeduplicatedTransaction[] => {
  return incoming.map(inc => {
    const incDate = normalizeDate(inc.tradeOpenDate);
    const incExpiry = normalizeDate(inc.expiryDate);

    // 1. Find exact matches
    const exactMatches = existing.filter(ex =>
      normalizeDate(ex.tradeOpenDate) === incDate &&
      normalizeDate(ex.expiryDate) === incExpiry &&
      ex.stockSymbol === inc.stockSymbol &&
      ex.strikePrice === inc.strikePrice &&
      ex.callOrPut === inc.callOrPut &&
      ex.buyOrSell === inc.buyOrSell &&
      ex.numberOfContracts === inc.numberOfContracts &&
      Math.abs((ex.premium || 0) - (inc.premium || 0)) < 0.01
    );

    if (exactMatches.length > 0) {
      return {
        ...inc,
        dedupStatus: 'ExactDuplicate',
        matchedTransactionIds: exactMatches.map(m => m.id)
      };
    }

    // 2. Find partial matches (same date, symbol, strike, type, but maybe quantity or premium differ due to partial fill)
    const partialMatches = existing.filter(ex =>
      normalizeDate(ex.tradeOpenDate) === incDate &&
      normalizeDate(ex.expiryDate) === incExpiry &&
      ex.stockSymbol === inc.stockSymbol &&
      ex.strikePrice === inc.strikePrice &&
      ex.callOrPut === inc.callOrPut &&
      ex.buyOrSell === inc.buyOrSell
    );

    if (partialMatches.length > 0) {
      return {
        ...inc,
        dedupStatus: 'PartialMatch',
        matchedTransactionIds: partialMatches.map(m => m.id)
      };
    }

    // 3. Find closing legs for existing open trades (LinkedToOpen)
    // E.g., incoming is Sell to Close, existing is Buy to Open for same expiry/strike
    if (inc.buyOrSell === 'Sell') {
      const openMatches = existing.filter(ex =>
        ex.status === 'Open' &&
        ex.buyOrSell === 'Buy' &&
        normalizeDate(ex.expiryDate) === incExpiry &&
        ex.stockSymbol === inc.stockSymbol &&
        ex.strikePrice === inc.strikePrice &&
        ex.callOrPut === inc.callOrPut
      );

      if (openMatches.length > 0) {
        return {
          ...inc,
          dedupStatus: 'LinkedToOpen',
          matchedTransactionIds: openMatches.map(m => m.id)
        };
      }
    }

    if (inc.buyOrSell === 'Buy') {
      const openMatches = existing.filter(ex =>
        ex.status === 'Open' &&
        ex.buyOrSell === 'Sell' &&
        normalizeDate(ex.expiryDate) === incExpiry &&
        ex.stockSymbol === inc.stockSymbol &&
        ex.strikePrice === inc.strikePrice &&
        ex.callOrPut === inc.callOrPut
      );

      if (openMatches.length > 0) {
        return {
          ...inc,
          dedupStatus: 'LinkedToOpen',
          matchedTransactionIds: openMatches.map(m => m.id)
        };
      }
    }

    // 4. Otherwise, clean
    return {
      ...inc,
      dedupStatus: 'Clean'
    };
  });
};
