import { OptionsTransaction } from '@/types/options';

export const calculateProfitLoss = (transaction: OptionsTransaction, exitPrice?: number): number => {
  // Universal P&L calculation: always deduct fees for consistency
  const contracts = transaction.numberOfContracts;
  const premium = transaction.premium;
  const fees = transaction.fees;

  let profitLoss = 0;

  // If exit price is provided, calculate P&L based on actual trade execution
  if (exitPrice !== undefined && exitPrice > 0) {
    if (transaction.buyOrSell === 'Buy') {
      // If you bought the option, profit = (exit price - premium paid) * contracts * 100
      // Positive exit price means you sold it for more than you paid
      profitLoss = (exitPrice - premium) * contracts * 100;
    } else {
      // If you sold the option, profit = (premium received - exit price) * contracts * 100
      // Exit price is what you paid to buy it back
      profitLoss = (premium - exitPrice) * contracts * 100;
    }
  } else {
    // For open trades, show premium received/paid as P&L
    if (transaction.buyOrSell === 'Buy') {
      // If you bought the option, you paid the premium (negative P&L until closed)
      profitLoss = -premium * contracts * 100;
    } else {
      // If you sold the option, you received the premium (positive P&L until closed)
      profitLoss = premium * contracts * 100;
    }
  }

  // Universal rule: always deduct fees from P&L
  profitLoss -= fees;

  return profitLoss;
};

// Calculate P&L for a new trade (when opening)
export const calculateNewTradeProfitLoss = (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>): number => {
  // For new trades, P&L is initially 0 since no exit has occurred yet
  // The premium is the cost/revenue, but P&L is realized only when closed
  return 0;
};


export const calculateAnnualizedROR = (transaction: OptionsTransaction): number | undefined => {
  const profitLoss = transaction.profitLoss || 0;
  const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate);
  const totalCost = transaction.premium * transaction.numberOfContracts * 100;

  if (daysHeld <= 0 || totalCost <= 0) {
    return undefined;
  }

  return ((profitLoss / totalCost) * (365 / daysHeld)) * 100;
};

export const updateTransactionPandL = (transaction: OptionsTransaction, currentStockPrice?: number): OptionsTransaction => {
  const profitLoss = calculateProfitLoss(transaction, currentStockPrice);
  const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate);
  const annualizedROR = calculateAnnualizedROR({ ...transaction, profitLoss });

  return {
    ...transaction,
    profitLoss,
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


export const isTradeExpired = (expiryDate: Date): boolean => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return today > expiry;
};

export const shouldUpdateTradeStatus = (transaction: any): boolean => {
  // Only update if trade is currently open and has expired
  return transaction.status === 'Open' && isTradeExpired(transaction.expiryDate);
};

// Centralized utility to get all realized transactions
// Only truly completed trades count as realized - rolled trades are ongoing strategies
export const getRealizedTransactions = (transactions: OptionsTransaction[]) => {
  return transactions.filter(t =>
    t.status === 'Closed' ||
    t.status === 'Expired' ||
    t.status === 'Assigned'
    // Note: 'Rolled' transactions are NOT realized - they're part of ongoing strategies
  );
};

// Centralized utility to calculate total realized P&L
export const calculateTotalRealizedPnL = (transactions: OptionsTransaction[]): number => {
  const realizedTransactions = getRealizedTransactions(transactions);
  return realizedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
};

// Centralized utility to format P&L as currency (rounded to whole numbers)
export const formatPnLCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

// Centralized utility to format P&L as simple number (rounded)
export const formatPnLNumber = (amount: number): string => {
  return `$${Math.round(amount)}`;
};

// Centralized utility to format P&L with arrow for consistent display
export const formatPnLWithArrow = (amount: number): { text: string; isPositive: boolean } => {
  const roundedAmount = Math.round(amount);
  const isPositive = roundedAmount >= 0;
  return {
    text: `$${Math.abs(roundedAmount)}`,
    isPositive
  };
};

// Centralized utility to calculate Chain P&L
export const calculateChainPnL = (chainId: string, transactions: OptionsTransaction[]): number => {
  return transactions
    .filter(t => t.chainId === chainId)
    .reduce((total, t) => total + (t.profitLoss || 0), 0);
};

export const calculateUnrealizedPnL = (transactions: any[], chains: any[] = []): number => {
  // Group transactions by chain
  const chainMap = new Map();
  chains.forEach(chain => {
    chainMap.set(chain.id, chain);
  });

  // Separate chained and non-chained transactions
  const chainedTransactions = transactions.filter(t => t.chainId);
  const nonChainedTransactions = transactions.filter(t => !t.chainId);

  let unrealizedPnL = 0;

  // For non-chained transactions: Use existing logic (Open + Rolled = unrealized)
  const nonChainedUnrealized = nonChainedTransactions.filter(t => t.status === 'Open' || t.status === 'Rolled');
  const nonChainedPnL = nonChainedUnrealized.reduce((total, transaction) => total + (transaction.profitLoss || 0), 0);

  unrealizedPnL += nonChainedPnL;

  // For chained transactions: Only Active chains count as unrealized
  const activeChainIds = new Set();
  chainedTransactions.forEach(t => {
    if (t.chainId) {
      const chain = chainMap.get(t.chainId);
      if (chain && chain.chainStatus === 'Active') {
        activeChainIds.add(t.chainId);
      }
    }
  });

  // Add P&L from all transactions in active chains
  const chainedUnrealized = chainedTransactions.filter(t => activeChainIds.has(t.chainId));
  const chainedPnL = chainedUnrealized.reduce((total, transaction) => total + (transaction.profitLoss || 0), 0);

  unrealizedPnL += chainedPnL;

  return unrealizedPnL;
};

/**
 * Calculate days held from trade open date to current date (or close date for closed trades)
 * @param openDate - The date the trade was opened
 * @param closeDate - Optional close date for closed trades, defaults to current date
 * @returns Number of days held (minimum 0)
 */
export const calculateDaysHeld = (openDate: string | Date, closeDate?: string | Date): number => {
  try {
    const opened = new Date(openDate);
    const closed = closeDate ? new Date(closeDate) : new Date();

    // Set time to start of day for accurate day calculation
    opened.setHours(0, 0, 0, 0);
    closed.setHours(0, 0, 0, 0);

    const diffTime = closed.getTime() - opened.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays); // Don't show negative days
  } catch (error) {
    console.error('Error calculating days held:', error);
    return 0;
  }
};

/**
 * Calculate days to expiry from current date to expiry date
 * @param expiryDate - The expiry date of the option
 * @returns Number of days to expiry (can be negative for expired options)
 */
export const calculateDaysToExpiry = (expiryDate: string | Date): number => {
  try {
    const expiry = new Date(expiryDate);
    const today = new Date();

    // Set time to start of day for accurate day calculation
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays; // Can be negative for expired options
  } catch (error) {
    console.error('Error calculating days to expiry:', error);
    return 0;
  }
};

/**
 * Alias for calculateDaysHeld with shorter name for convenience
 */
export const calculateDH = calculateDaysHeld;

/**
 * Alias for calculateDaysToExpiry with shorter name for convenience
 */
export const calculateDTE = calculateDaysToExpiry;
