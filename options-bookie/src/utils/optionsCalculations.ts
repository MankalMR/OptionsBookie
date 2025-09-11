import { OptionsTransaction } from '@/types/options';

export const calculateProfitLoss = (transaction: OptionsTransaction, exitPrice?: number): number => {
  // If exit price is provided, calculate P&L based on actual trade execution
  if (exitPrice !== undefined && exitPrice > 0) {
    const contracts = transaction.numberOfContracts;
    const premium = transaction.premium;

    let profitLoss = 0;
    if (transaction.buyOrSell === 'Buy') {
      // If you bought the option, profit = (exit price - premium paid) * contracts * 100
      // Positive exit price means you sold it for more than you paid
      profitLoss = (exitPrice - premium) * contracts * 100;
    } else {
      // If you sold the option, profit = (premium received - exit price) * contracts * 100
      // Exit price is what you paid to buy it back
      profitLoss = (premium - exitPrice) * contracts * 100;
    }

    return profitLoss;
  }

  // For open trades, show premium received/paid as P&L
  const contracts = transaction.numberOfContracts;
  const premium = transaction.premium;

  let profitLoss = 0;
  if (transaction.buyOrSell === 'Buy') {
    // If you bought the option, you paid the premium (negative P&L until closed)
    profitLoss = -premium * contracts * 100;
  } else {
    // If you sold the option, you received the premium (positive P&L until closed)
    profitLoss = premium * contracts * 100;
  }

  return profitLoss;
};

// Calculate P&L for a new trade (when opening)
export const calculateNewTradeProfitLoss = (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>): number => {
  // For new trades, P&L is initially 0 since no exit has occurred yet
  // The premium is the cost/revenue, but P&L is realized only when closed
  return 0;
};

export const calculateDaysHeld = (transaction: OptionsTransaction): number => {
  const openDate = new Date(transaction.tradeOpenDate);
  const closeDate = transaction.closeDate ? new Date(transaction.closeDate) : new Date();
  const diffTime = closeDate.getTime() - openDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateAnnualizedROR = (transaction: OptionsTransaction): number | undefined => {
  const profitLoss = transaction.profitLoss || 0;
  const daysHeld = transaction.daysHeld || calculateDaysHeld(transaction);
  const totalCost = transaction.premium * transaction.numberOfContracts * 100;

  if (daysHeld <= 0 || totalCost <= 0) {
    return undefined;
  }

  return ((profitLoss / totalCost) * (365 / daysHeld)) * 100;
};

export const updateTransactionPandL = (transaction: OptionsTransaction, currentStockPrice?: number): OptionsTransaction => {
  const profitLoss = calculateProfitLoss(transaction, currentStockPrice);
  const daysHeld = calculateDaysHeld(transaction);
  const annualizedROR = calculateAnnualizedROR({ ...transaction, profitLoss, daysHeld });

  return {
    ...transaction,
    profitLoss,
    daysHeld,
    annualizedROR,
    stockPriceCurrent: currentStockPrice || transaction.stockPriceCurrent,
    updatedAt: new Date(),
  };
};

export const calculateBreakEven = (transaction: OptionsTransaction): number => {
  if (transaction.callOrPut === 'Call') {
    return transaction.strikePrice + transaction.premium;
  } else {
    return transaction.strikePrice - transaction.premium;
  }
};

export const calculateDaysToExpiry = (expiryDate: Date): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isTradeExpired = (expiryDate: Date): boolean => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return today > expiry;
};

export const shouldUpdateTradeStatus = (transaction: any): boolean => {
  // Only update if trade is currently open and has expired
  return transaction.status === 'Open' && isTradeExpired(transaction.expiryDate);
};

export const calculateUnrealizedPnL = (transactions: any[]): number => {
  // Simplified: Just sum the profitLoss field of all open trades
  return transactions
    .filter(t => t.status === 'Open')
    .reduce((total, transaction) => total + (transaction.profitLoss || 0), 0);
};
