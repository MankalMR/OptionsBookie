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

// Calculate collateral requirement for an options trade
export const calculateCollateral = (transaction: OptionsTransaction): number => {
  // For now, use a basic calculation - this can be enhanced based on strategy type
  // Cash-secured put: strike * 100 * contracts
  // Covered call: current stock value (approximated by strike for now)
  // This will be replaced with more sophisticated logic based on strategy

  if (transaction.callOrPut === 'Put' && transaction.buyOrSell === 'Sell') {
    // Cash-secured put
    return transaction.strikePrice * 100 * transaction.numberOfContracts;
  } else if (transaction.callOrPut === 'Call' && transaction.buyOrSell === 'Sell') {
    // Covered call (assuming stock is owned - approximate with strike value)
    return transaction.strikePrice * 100 * transaction.numberOfContracts;
  } else {
    // Long options - premium paid is the max risk
    return transaction.premium * 100 * transaction.numberOfContracts;
  }
};

// Calculate Return on Risk percentage
export const calculateRoR = (transaction: OptionsTransaction): number => {
  const collateral = calculateCollateral(transaction);
  const profitLoss = transaction.profitLoss || 0;

  if (collateral === 0) return 0;

  return (profitLoss / collateral) * 100;
};

// Calculate total collateral for a chain
// Only count collateral for currently OPEN positions (closed/rolled positions don't tie up capital)
export const calculateChainCollateral = (chainId: string, transactions: OptionsTransaction[]): number => {
  return transactions
    .filter(t => t.chainId === chainId && t.status === 'Open')
    .reduce((total, t) => total + calculateCollateral(t), 0);
};

// Calculate chain-level Return on Risk percentage
export const calculateChainRoR = (chainId: string, transactions: OptionsTransaction[]): number => {
  const chainTransactions = transactions.filter(t => t.chainId === chainId);
  const totalPnL = calculateChainPnL(chainId, transactions);

  // For RoR calculation, use current collateral for active chains,
  // or maximum historical collateral for closed chains
  const openPositions = chainTransactions.filter(t => t.status === 'Open');
  let collateralForRoR: number;

  if (openPositions.length > 0) {
    // Active chain: use current collateral requirement
    collateralForRoR = calculateChainCollateral(chainId, transactions);
  } else {
    // Closed chain: use the maximum collateral that was ever deployed
    // This gives a meaningful RoR for completed strategies
    collateralForRoR = Math.max(...chainTransactions.map(t => calculateCollateral(t)));
  }

  if (collateralForRoR === 0) return 0;

  return (totalPnL / collateralForRoR) * 100;
};

// Calculate total capital deployed across all open positions
export const calculateTotalDeployedCapital = (transactions: OptionsTransaction[]): number => {
  return transactions
    .filter(t => t.status === 'Open')
    .reduce((total, t) => total + calculateCollateral(t), 0);
};

// Calculate average RoR across all positions (both open and closed)
export const calculateAverageRoR = (transactions: OptionsTransaction[]): number => {
  const transactionsWithRoR = transactions
    .map(t => calculateRoR(t))
    .filter(ror => !isNaN(ror) && isFinite(ror));

  if (transactionsWithRoR.length === 0) return 0;

  return transactionsWithRoR.reduce((sum, ror) => sum + ror, 0) / transactionsWithRoR.length;
};

// Determine strategy type based on transaction characteristics
export const getStrategyType = (transaction: OptionsTransaction): string => {
  const { callOrPut, buyOrSell } = transaction;

  if (callOrPut === 'Put' && buyOrSell === 'Sell') {
    return 'Cash-Secured Put';
  } else if (callOrPut === 'Call' && buyOrSell === 'Sell') {
    return 'Covered Call';
  } else if (callOrPut === 'Put' && buyOrSell === 'Buy') {
    return 'Long Put';
  } else if (callOrPut === 'Call' && buyOrSell === 'Buy') {
    return 'Long Call';
  }

  return 'Other';
};

// Calculate strategy performance analytics
export const calculateStrategyPerformance = (transactions: OptionsTransaction[]) => {
  const strategies = new Map<string, {
    trades: OptionsTransaction[];
    totalPnL: number;
    totalCollateral: number;
    avgRoR: number;
    winRate: number;
    avgDaysHeld: number;
  }>();

  // Group transactions by strategy type
  transactions.forEach(transaction => {
    const strategyType = getStrategyType(transaction);

    if (!strategies.has(strategyType)) {
      strategies.set(strategyType, {
        trades: [],
        totalPnL: 0,
        totalCollateral: 0,
        avgRoR: 0,
        winRate: 0,
        avgDaysHeld: 0
      });
    }

    strategies.get(strategyType)!.trades.push(transaction);
  });

  // Calculate metrics for each strategy
  strategies.forEach((strategy, strategyType) => {
    const { trades } = strategy;

    // Only include realized trades for most metrics
    const realizedTrades = getRealizedTransactions(trades);

    strategy.totalPnL = realizedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    // Calculate average collateral (use max historical for realized trades)
    strategy.totalCollateral = trades
      .filter(t => t.status === 'Open')
      .reduce((sum, t) => sum + calculateCollateral(t), 0);

    // If no open trades, use average historical collateral
    if (strategy.totalCollateral === 0 && realizedTrades.length > 0) {
      strategy.totalCollateral = realizedTrades.reduce((sum, t) => sum + calculateCollateral(t), 0) / realizedTrades.length;
    }

    // Calculate average RoR
    const rorValues = trades.map(t => calculateRoR(t)).filter(ror => !isNaN(ror) && isFinite(ror));
    strategy.avgRoR = rorValues.length > 0 ? rorValues.reduce((sum, ror) => sum + ror, 0) / rorValues.length : 0;

    // Calculate win rate
    const winningTrades = realizedTrades.filter(t => (t.profitLoss || 0) > 0);
    strategy.winRate = realizedTrades.length > 0 ? (winningTrades.length / realizedTrades.length) * 100 : 0;

    // Calculate average days held
    strategy.avgDaysHeld = realizedTrades.length > 0
      ? realizedTrades.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate), 0) / realizedTrades.length
      : 0;
  });

  return Array.from(strategies.entries()).map(([strategyType, metrics]) => ({
    strategy: strategyType,
    tradeCount: metrics.trades.length,
    realizedCount: getRealizedTransactions(metrics.trades).length,
    openCount: metrics.trades.filter(t => t.status === 'Open').length,
    totalPnL: metrics.totalPnL,
    avgCollateral: metrics.totalCollateral,
    avgRoR: metrics.avgRoR,
    winRate: metrics.winRate,
    avgDaysHeld: metrics.avgDaysHeld
  })).sort((a, b) => b.avgRoR - a.avgRoR); // Sort by RoR descending
};

// Calculate monthly P&L and RoR data for charts
export const calculateMonthlyChartData = (transactions: OptionsTransaction[]) => {
  const realizedTransactions = getRealizedTransactions(transactions);

  // Group by month and calculate metrics
  const monthlyData = new Map<string, {
    month: string;
    pnl: number;
    trades: OptionsTransaction[];
    totalCollateral: number;
  }>();

  realizedTransactions.forEach(transaction => {
    if (!transaction.closeDate) return;

    const closeDate = new Date(transaction.closeDate);
    const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = closeDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthLabel,
        pnl: 0,
        trades: [],
        totalCollateral: 0
      });
    }

    const monthData = monthlyData.get(monthKey)!;
    monthData.pnl += transaction.profitLoss || 0;
    monthData.trades.push(transaction);
    monthData.totalCollateral += calculateCollateral(transaction);
  });

  // Convert to array and calculate RoR
  return Array.from(monthlyData.values())
    .map(data => ({
      month: data.month,
      pnl: Math.round(data.pnl),
      ror: data.totalCollateral > 0 ? Number((data.pnl / data.totalCollateral * 100).toFixed(1)) : 0,
      trades: data.trades.length
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
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
