import { OptionsTransaction, TradeChain } from '@/types/options';
import { parseLocalDate } from '@/utils/dateUtils';

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
export const calculateNewTradeProfitLoss = (): number => {
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


export const isTradeExpired = (expiryDate: Date | string): boolean => {
  const today = new Date();
  const expiry = new Date(expiryDate);

  // Options expire at market close (4:00 PM ET = 8:00 PM UTC)
  // Set expiry time to 8:00 PM UTC (4:00 PM ET) on the expiry date
  const expiryWithMarketClose = new Date(expiry);
  expiryWithMarketClose.setUTCHours(20, 0, 0, 0); // 8:00 PM UTC = 4:00 PM ET

  return today > expiryWithMarketClose;
};

export const shouldUpdateTradeStatus = (transaction: OptionsTransaction): boolean => {
  // Only update if trade is currently open and has expired
  return transaction.status === 'Open' && isTradeExpired(transaction.expiryDate);
};

// Centralized utility to get all realized transactions
// Only truly completed trades count as realized - rolled trades are ongoing strategies
export const getRealizedTransactions = (transactions: OptionsTransaction[], chains: TradeChain[] = []) => {
  return transactions.filter(t => {
    // Include standard realized transactions
    if (t.status === 'Closed' || t.status === 'Expired' || t.status === 'Assigned') {
      return true;
    }

    // Include rolled transactions that are part of closed chains
    if (t.status === 'Rolled' && t.chainId) {
      const chain = chains.find(c => c.id === t.chainId);
      return chain && chain.chainStatus === 'Closed';
    }

    return false;
  });
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
  const chainTransactions = transactions.filter(t => t.chainId === chainId);
  return chainTransactions.reduce((total, t) => total + (t.profitLoss || 0), 0);
};

// Calculate collateral requirement for an options trade
export const calculateCollateral = (transaction: OptionsTransaction): number => {
  // If manual collateral amount is specified, use it (for accurate RoR in complex strategies)
  if (transaction.collateralAmount && transaction.collateralAmount > 0) {
    return transaction.collateralAmount;
  }

  // Otherwise, use automatic calculation based on strategy type
  if (transaction.callOrPut === 'Put' && transaction.buyOrSell === 'Sell') {
    // Cash-secured put: strike * 100 * contracts
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

// Calculate Annualized Return on Risk percentage
export const calculateAnnualizedRoR = (transaction: OptionsTransaction): number => {
  const ror = calculateRoR(transaction);

  if (!transaction.closeDate || ror === 0) return 0;

  // Check for invalid date order before calculating days held
  const openDate = new Date(transaction.tradeOpenDate);
  const closeDate = new Date(transaction.closeDate);
  if (closeDate < openDate) return NaN; // Invalid data - close before open

  const daysHeld = calculateDaysHeld(transaction.tradeOpenDate, transaction.closeDate);

  if (daysHeld === 0) {
    // Same-day trade: use 0.5 days to avoid infinity but show very high returns
    return (ror * 365) / 0.5;
  }

  // Annualized RoR = RoR × (365 / Days Held)
  return (ror * 365) / daysHeld;
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

// Calculate Portfolio RoR (Total P&L / Total Capital Deployed * 100)
// This is the standardized method used across all time periods for consistency
export const calculatePortfolioRoR = (transactions: OptionsTransaction[]): number => {
  const realizedTransactions = getRealizedTransactions(transactions);
  const totalPnL = realizedTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  const totalCollateral = realizedTransactions.reduce((sum, t) => sum + calculateCollateral(t), 0);

  return totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
};

// Calculate Portfolio Annualized RoR (Time-weighted portfolio return)
export const calculatePortfolioAnnualizedRoR = (transactions: OptionsTransaction[]): number => {
  const realizedTransactions = getRealizedTransactions(transactions);

  if (realizedTransactions.length === 0) return 0;

  // Calculate weighted average annualized RoR based on capital deployment
  let totalWeightedAnnualizedReturn = 0;
  let totalCollateral = 0;

  realizedTransactions.forEach(transaction => {
    const collateral = calculateCollateral(transaction);
    const annualizedRoR = calculateAnnualizedRoR(transaction);

    if (collateral > 0 && isFinite(annualizedRoR)) {
      totalWeightedAnnualizedReturn += (annualizedRoR * collateral);
      totalCollateral += collateral;
    }
  });

  return totalCollateral > 0 ? totalWeightedAnnualizedReturn / totalCollateral : 0;
};

// =============================================================================
// TIME-PERIOD BASED ANNUALIZED ROR CALCULATIONS
// =============================================================================

/**
 * Calculate time-period based annualized RoR
 * This method assumes capital was deployed for the entire period and calculates
 * what the return would be if sustained for 365 days
 */
export const calculateTimeBasedAnnualizedRoR = (ror: number, days: number): number => {
  if (days <= 0 || !isFinite(ror)) return 0;
  return (ror * 365) / days;
};

/**
 * Calculate monthly annualized RoR using time-period approach
 * Assumes capital was rotated/deployed for 30 days
 */
export const calculateMonthlyAnnualizedRoR = (monthlyRoR: number): number => {
  return calculateTimeBasedAnnualizedRoR(monthlyRoR, 30);
};

/**
 * Calculate yearly annualized RoR using time-period approach
 * Uses 365 days as the base period
 */
export const calculateYearlyAnnualizedRoR = (yearlyRoR: number): number => {
  return calculateTimeBasedAnnualizedRoR(yearlyRoR, 365);
};

/**
 * Calculate all-time annualized RoR using time-period approach
 * Based on total calendar days since portfolio started
 * Formula: R_total × (365 ÷ D_total)
 */
export const calculateAllTimeAnnualizedRoR = (totalRoR: number, portfolioStartDate: Date): number => {
  const totalDays = Math.floor((Date.now() - portfolioStartDate.getTime()) / (1000 * 60 * 60 * 24));
  return calculateTimeBasedAnnualizedRoR(totalRoR, Math.max(totalDays, 1)); // Minimum 1 day
};

/**
 * Calculate yearly annualized RoR using active trading days
 * Formula: R_yearly × (365 ÷ D_active)
 */
export const calculateYearlyAnnualizedRoRWithActiveDays = (yearlyRoR: number, activeDays: number): number => {
  return calculateTimeBasedAnnualizedRoR(yearlyRoR, Math.max(activeDays, 1));
};

/**
 * Get the annualized RoR calculation method based on environment variable
 * ANN_ROR_TYPE: 'time-period' (default) or 'trade-weighted'
 */
export const getAnnualizedRoRMethod = (): 'time-period' | 'trade-weighted' => {
  const envValue = process.env.ANN_ROR_TYPE?.toLowerCase();
  return envValue === 'trade-weighted' ? 'trade-weighted' : 'time-period';
};

/**
 * Calculate portfolio annualized RoR with configurable method
 * Supports both time-period based and trade-weighted approaches
 */
export const calculatePortfolioAnnualizedRoRWithMethod = (
  transactions: OptionsTransaction[],
  method?: 'time-period' | 'trade-weighted',
  periodDays?: number
): number => {
  const calculationMethod = method || getAnnualizedRoRMethod();

  if (calculationMethod === 'trade-weighted') {
    return calculatePortfolioAnnualizedRoR(transactions);
  }

  // Time-period based calculation
  const portfolioRoR = calculatePortfolioRoR(transactions);
  const days = periodDays || 365; // Default to yearly if no period specified

  return calculateTimeBasedAnnualizedRoR(portfolioRoR, days);
};

/**
 * Calculate monthly portfolio annualized RoR with method toggle
 */
export const calculateMonthlyPortfolioAnnualizedRoR = (transactions: OptionsTransaction[]): number => {
  const method = getAnnualizedRoRMethod();

  if (method === 'trade-weighted') {
    return calculatePortfolioAnnualizedRoR(transactions);
  }

  const monthlyRoR = calculatePortfolioRoR(transactions);
  return calculateMonthlyAnnualizedRoR(monthlyRoR);
};

/**
 * Calculate yearly portfolio annualized RoR with method toggle
 */
export const calculateYearlyPortfolioAnnualizedRoR = (transactions: OptionsTransaction[]): number => {
  const method = getAnnualizedRoRMethod();

  if (method === 'trade-weighted') {
    return calculatePortfolioAnnualizedRoR(transactions);
  }

  const yearlyRoR = calculatePortfolioRoR(transactions);
  return calculateYearlyAnnualizedRoR(yearlyRoR);
};

// Get color classes for RoR values (both regular and annualized)
export const getRoRColorClasses = (ror: number, annualizedRoR?: number): string => {
  // If both values are provided, both must be non-negative for green color
  if (annualizedRoR !== undefined) {
    return (ror >= 0 && annualizedRoR >= 0)
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  }

  // If only regular RoR is provided
  return ror >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
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
    avgAnnualizedRoR: number;
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
        avgAnnualizedRoR: 0,
        winRate: 0,
        avgDaysHeld: 0
      });
    }

    strategies.get(strategyType)!.trades.push(transaction);
  });

  // Calculate metrics for each strategy
  strategies.forEach((strategy) => {
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

    // Calculate average RoR (only for realized trades)
    const rorValues = realizedTrades.map(t => calculateRoR(t)).filter(ror => !isNaN(ror) && isFinite(ror));
    strategy.avgRoR = rorValues.length > 0 ? rorValues.reduce((sum, ror) => sum + ror, 0) / rorValues.length : 0;

    // Calculate average annualized RoR (only for realized trades)
    const annualizedRorValues = realizedTrades.map(t => calculateAnnualizedRoR(t)).filter(ror => !isNaN(ror) && isFinite(ror));
    strategy.avgAnnualizedRoR = annualizedRorValues.length > 0 ? annualizedRorValues.reduce((sum, ror) => sum + ror, 0) / annualizedRorValues.length : 0;

    // Calculate win rate
    const winningTrades = realizedTrades.filter(t => (t.profitLoss || 0) > 0);
    strategy.winRate = realizedTrades.length > 0 ? (winningTrades.length / realizedTrades.length) * 100 : 0;

    // Calculate average days held
    strategy.avgDaysHeld = realizedTrades.length > 0
      ? realizedTrades.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate), 0) / realizedTrades.length
      : 0;
  });

  return Array.from(strategies.entries()).map(([strategyType, metrics]) => {
    const realizedCount = getRealizedTransactions(metrics.trades).length;
    const openCount = metrics.trades.filter(t => t.status === 'Open').length;
    const rolledCount = metrics.trades.filter(t => t.status === 'Rolled').length;

    return {
      strategy: strategyType,
      tradeCount: metrics.trades.length,
      realizedCount,
      openCount: openCount + rolledCount, // Rolled trades are ongoing, so count as "open"
      totalPnL: metrics.totalPnL,
      avgCollateral: metrics.totalCollateral,
      avgRoR: metrics.avgRoR,
      avgAnnualizedRoR: metrics.avgAnnualizedRoR,
      winRate: metrics.winRate,
      avgDaysHeld: metrics.avgDaysHeld
    };
  }).sort((a, b) => b.avgRoR - a.avgRoR); // Sort by RoR descending
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

    const closeDate = parseLocalDate(transaction.closeDate);
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
  const chartData = Array.from(monthlyData.values())
    .map(data => ({
      month: data.month,
      pnl: Math.round(data.pnl),
      ror: data.totalCollateral > 0 ? Number((data.pnl / data.totalCollateral * 100).toFixed(1)) : 0,
      trades: data.trades.length,
      totalCollateral: Math.round(data.totalCollateral)
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  return chartData;
};

// Calculate top tickers by P&L and RoR for each month using chain-aware logic
export const calculateMonthlyTopTickers = (transactions: OptionsTransaction[], chains: TradeChain[] = []) => {
  const realizedTransactions = getRealizedTransactions(transactions, chains);

  // Group by month and calculate chain-aware ticker performance
  const monthlyTickerData = new Map<string, Map<string, {
    ticker: string;
    pnl: number;
    trades: number;
    totalCollateral: number;
  }>>();

  // Group transactions by month using chain-aware effective close dates
  const monthlyTransactions = new Map<string, OptionsTransaction[]>();
  realizedTransactions.forEach(transaction => {
    if (!transaction.closeDate) return;

    const effectiveCloseDate = getEffectiveCloseDate(transaction, realizedTransactions, chains);
    const monthKey = `${effectiveCloseDate.getFullYear()}-${String(effectiveCloseDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyTransactions.has(monthKey)) {
      monthlyTransactions.set(monthKey, []);
    }
    monthlyTransactions.get(monthKey)!.push(transaction);
  });

  // Calculate chain-aware performance for each month
  monthlyTransactions.forEach((transactions, monthKey) => {
    const stockPerformance = calculateChainAwareStockPerformance(transactions, chains);


    const monthData = new Map<string, {
      ticker: string;
      pnl: number;
      trades: number;
      totalCollateral: number;
    }>();

    stockPerformance.forEach((data, ticker) => {
      monthData.set(ticker, {
        ticker,
        pnl: data.pnl,
        trades: data.trades,
        totalCollateral: data.totalCollateral
      });
    });

    monthlyTickerData.set(monthKey, monthData);
  });

  // Find top tickers by P&L and RoR for each month
  return Array.from(monthlyTickerData.entries())
    .map(([monthKey, tickerMap]) => {
      const tickers = Array.from(tickerMap.values()).map(ticker => ({
        ...ticker,
        ror: ticker.totalCollateral > 0 ?
          Number((ticker.pnl / ticker.totalCollateral * 100).toFixed(1)) : 0
      }));

      const topByPnL = tickers.reduce((best, current) =>
        current.pnl > best.pnl ? current : best
      );

      const topByRoR = tickers.reduce((best, current) =>
        current.ror > best.ror ? current : best
      );

      return {
        monthKey,
        topByPnL: {
          ticker: topByPnL.ticker,
          pnl: Math.round(topByPnL.pnl),
          ror: topByPnL.ror
        },
        topByRoR: {
          ticker: topByRoR.ticker,
          pnl: Math.round(topByRoR.pnl),
          ror: topByRoR.ror
        }
      };
    });
};

// Calculate top 5 tickers yearly performance for charting
export const calculateTop5TickersYearlyPerformance = (transactions: OptionsTransaction[]) => {
  const realizedTransactions = getRealizedTransactions(transactions);

  // First, calculate total P&L per ticker to identify top 5
  const tickerTotals = new Map<string, number>();
  realizedTransactions.forEach(transaction => {
    const ticker = transaction.stockSymbol;
    const pnl = transaction.profitLoss || 0;
    tickerTotals.set(ticker, (tickerTotals.get(ticker) || 0) + pnl);
  });

  // Get top 5 tickers by total P&L
  const top5Tickers = Array.from(tickerTotals.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([ticker]) => ticker);

  // Group by year for top 5 tickers
  interface YearlyTickerData {
    year: string;
    [key: string]: string | number; // Will contain ticker_pnl and ticker_ror keys
  }

  const yearlyData = new Map<string, YearlyTickerData>();

  realizedTransactions
    .filter(transaction => top5Tickers.includes(transaction.stockSymbol))
    .forEach(transaction => {
      if (!transaction.closeDate) return;

      const closeDate = parseLocalDate(transaction.closeDate);
      const year = closeDate.getFullYear().toString();
      const ticker = transaction.stockSymbol;

      if (!yearlyData.has(year)) {
        yearlyData.set(year, { year });
      }

      const yearData = yearlyData.get(year)!;

      // Initialize ticker data if not exists
      if (!yearData[`${ticker}_pnl`]) {
        yearData[`${ticker}_pnl`] = 0;
        yearData[`${ticker}_trades`] = 0;
        yearData[`${ticker}_collateral`] = 0;
      }

      (yearData[`${ticker}_pnl`] as number) += transaction.profitLoss || 0;
      (yearData[`${ticker}_trades`] as number) += 1;
      (yearData[`${ticker}_collateral`] as number) += calculateCollateral(transaction);
    });

  // Calculate RoR and format data
  const chartData = Array.from(yearlyData.values())
    .map(data => {
      const result = { ...data };

      // Calculate RoR for each ticker
      top5Tickers.forEach(ticker => {
        const collateral = result[`${ticker}_collateral`] as number;
        const pnl = result[`${ticker}_pnl`] as number;

        if (collateral > 0) {
          result[`${ticker}_ror`] = Number(
            ((pnl || 0) / collateral * 100).toFixed(1)
          );
        } else {
          result[`${ticker}_ror`] = 0;
        }

        // Round P&L values
        result[`${ticker}_pnl`] = Math.round(pnl || 0);
      });

      return result;
    })
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));

  return {
    chartData,
    top5Tickers,
    tickerTotals: Object.fromEntries(
      top5Tickers.map(ticker => [ticker, Math.round(tickerTotals.get(ticker) || 0)])
    )
  };
};

export const calculateUnrealizedPnL = (transactions: OptionsTransaction[], chains: TradeChain[] = []): number => {
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
 * Calculate chain-aware monthly P&L attribution
 * For closed chains: attributes entire chain P&L to the closing month
 * For individual transactions: uses individual transaction P&L
 * For rolled transactions: excludes them (they're part of ongoing chains)
 */
export const calculateChainAwareMonthlyPnL = (
  transactions: OptionsTransaction[],
  chains: TradeChain[] = [],
  year: number,
  month: number
): { totalPnL: number; totalTrades: number; fees: number } => {
  let totalPnL = 0;
  let totalTrades = 0;
  let fees = 0;
  const processedChains = new Set<string>();

  // Get all transactions for this month using chain-aware effective close dates
  const monthTransactions = transactions.filter(t => {
    if (!t.closeDate) return false;
    const effectiveCloseDate = getEffectiveCloseDate(t, transactions, chains);
    return effectiveCloseDate.getFullYear() === year && effectiveCloseDate.getMonth() === month;
  });

  monthTransactions.forEach(transaction => {
    // Skip rolled transactions - they're part of chains and shouldn't be counted individually
    if (transaction.status === 'Rolled') {
      return;
    }

    if (transaction.chainId && !processedChains.has(transaction.chainId)) {
      // This is a chained transaction and we haven't processed this chain yet
      const chain = chains.find(c => c.id === transaction.chainId);

      if (chain && chain.chainStatus === 'Closed') {
        // For closed chains, attribute the entire chain P&L to this month
        const chainPnL = calculateChainPnL(transaction.chainId, transactions);
        const chainTransactions = transactions.filter(t => t.chainId === transaction.chainId);
        const chainFees = chainTransactions.reduce((sum, t) => sum + (t.fees || 0), 0);

        totalPnL += chainPnL;
        totalTrades += 1; // Count the chain as one "trade"
        fees += chainFees;
        processedChains.add(transaction.chainId);
      }
    } else if (!transaction.chainId) {
      // Non-chained transaction - use individual P&L
      totalPnL += transaction.profitLoss || 0;
      totalTrades += 1;
      fees += transaction.fees || 0;
    }
  });

  return { totalPnL, totalTrades, fees };
};

/**
 * Get the effective close date for a transaction, using chain close date for chained transactions
 * This ensures chain P&L is attributed to the month when the chain closes
 */
export const getEffectiveCloseDate = (
  transaction: OptionsTransaction,
  allTransactions: OptionsTransaction[],
  chains: TradeChain[] = []
): Date => {
  if (!transaction.closeDate) {
    return new Date(); // Fallback for transactions without close date
  }

  const baseCloseDate = parseLocalDate(transaction.closeDate);

  // For chained transactions, use the final chain close date
  if (transaction.chainId) {
    const chain = chains.find(c => c.id === transaction.chainId);
    if (chain && chain.chainStatus === 'Closed') {
      // Find the latest close date in the chain
      const chainTransactions = allTransactions.filter(t =>
        t.chainId === transaction.chainId && t.closeDate
      );
      if (chainTransactions.length > 0) {
        const latestCloseDate = chainTransactions
          .map(t => parseLocalDate(t.closeDate!))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return latestCloseDate;
      }
    }
  }

  return baseCloseDate;
};

/**
 * Calculate chain-aware stock performance for a given time period
 * Properly attributes chain P&L to stocks instead of individual transaction P&L
 */
export const calculateChainAwareStockPerformance = (
  transactions: OptionsTransaction[],
  chains: TradeChain[] = []
): Map<string, { pnl: number; trades: number; totalCollateral: number }> => {
  const stockPerformance = new Map<string, { pnl: number; trades: number; totalCollateral: number }>();
  const processedChains = new Set<string>();

  transactions.forEach(transaction => {
    // Skip rolled transactions - they're part of chains
    if (transaction.status === 'Rolled') {
      return;
    }

    const symbol = transaction.stockSymbol;

    if (!stockPerformance.has(symbol)) {
      stockPerformance.set(symbol, { pnl: 0, trades: 0, totalCollateral: 0 });
    }

    const perf = stockPerformance.get(symbol)!;

    if (transaction.chainId && !processedChains.has(transaction.chainId)) {
      // Chain transaction - use entire chain P&L
      const chain = chains.find(c => c.id === transaction.chainId);

      if (chain && chain.chainStatus === 'Closed') {
        const chainPnL = calculateChainPnL(transaction.chainId, transactions);
        const chainTransactions = transactions.filter(t => t.chainId === transaction.chainId);
        const chainCollateral = chainTransactions.reduce((sum, t) => sum + calculateCollateral(t), 0);


        perf.pnl += chainPnL;
        perf.trades += 1; // Count chain as one trade
        perf.totalCollateral += chainCollateral;
        processedChains.add(transaction.chainId);
      }
    } else if (!transaction.chainId) {
      // Non-chained transaction - use individual P&L
      perf.pnl += transaction.profitLoss || 0;
      perf.trades += 1;
      perf.totalCollateral += calculateCollateral(transaction);
    }
  });

  return stockPerformance;
};

/**
 * Calculate days held from trade open date to current date (or close date for closed trades)
 * @param openDate - The date the trade was opened
 * @param closeDate - Optional close date for closed trades, defaults to current date
 * @returns Number of days held (minimum 0)
 */
export const calculateDaysHeld = (openDate: string | Date, closeDate?: string | Date): number => {
  try {
    const opened = parseLocalDate(openDate);
    const closed = closeDate ? parseLocalDate(closeDate) : new Date();

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
 * Uses timezone-safe date utilities for accurate calculations
 * @param expiryDate - The expiry date of the option
 * @returns Number of days to expiry (0 for today, 1 for tomorrow, etc.)
 */
export const calculateDaysToExpiry = (expiryDate: string | Date): number => {
  try {
    // Handle edge cases that can cause NaN
    if (!expiryDate || expiryDate === '' || expiryDate === null || expiryDate === undefined) {
      return 0;
    }

    // Use timezone-safe parsing for the expiry date
    let expiry: Date;
    if (typeof expiryDate === 'string') {
      // Check for basic YYYY-MM-DD format or ISO string
      if (expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simple YYYY-MM-DD format
        const [year, month, day] = expiryDate.split('-').map(Number);

        // Validate parsed components
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 0;
        }

        // Validate ranges to catch malformed dates like 2025-13-45
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return 0;
        }

        expiry = new Date(year, month - 1, day); // month is 0-indexed

        // Verify the created date matches input (catches rollovers like month 13)
        if (expiry.getFullYear() !== year || expiry.getMonth() !== (month - 1) || expiry.getDate() !== day) {
          return 0;
        }
      } else if (expiryDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // ISO string with time component - extract date part
        const datePart = expiryDate.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);

        // Validate parsed components
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 0;
        }

        // Validate ranges to catch malformed dates
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return 0;
        }

        expiry = new Date(year, month - 1, day); // month is 0-indexed

        // Verify the created date matches input (catches rollovers)
        if (expiry.getFullYear() !== year || expiry.getMonth() !== (month - 1) || expiry.getDate() !== day) {
          return 0;
        }
      } else {
        return 0;
      }
    } else {
      expiry = new Date(expiryDate);
    }

    // Check if the created date is valid
    if (isNaN(expiry.getTime())) {
      return 0;
    }

    const today = new Date();

    // Set both dates to start of day for accurate day calculation
    // Use local timezone to avoid UTC shifts
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const expiryYear = expiry.getFullYear();
    const expiryMonth = expiry.getMonth();
    const expiryDay = expiry.getDate();

    // Create new date objects at midnight local time
    const todayMidnight = new Date(todayYear, todayMonth, todayDate);
    const expiryMidnight = new Date(expiryYear, expiryMonth, expiryDay);

    // Calculate difference in days
    const diffTime = expiryMidnight.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Ensure we don't return NaN
    if (isNaN(diffDays)) {
      return 0;
    }

    // Options trading standard:
    // - Same day (expiry today) = 0 DTE
    // - Tomorrow (expiry tomorrow) = 1 DTE
    // - Since we set both dates to midnight, difference should be exact
    // - Don't show negative DTE for expired options
    return Math.max(0, diffDays);
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

/**
 * Calculate active trading days based on unique months with trades × 30
 * This provides a standardized way to measure trading activity duration
 */
export function calculateActiveTradingDays(transactions: OptionsTransaction[]): number {
  const monthKeys = transactions.map(t => {
    const tradeDate = new Date(t.tradeOpenDate);
    const key = `${tradeDate.getFullYear()}-${tradeDate.getMonth()}`;
    return key;
  });

  const activeMonths = new Set(monthKeys).size;

  return activeMonths * 30;
}

/**
 * Calculate yearly annualized RoR using active trading days (months × 30)
 * This is more accurate than using individual trading days as it accounts for
 * the sustained capital deployment over full months
 */
export function calculateYearlyAnnualizedRoRWithActiveMonths(
  transactions: OptionsTransaction[],
  year?: number
): { annualizedRoR: number; activeTradingDays: number; baseRoR: number } {
  const targetYear = year || new Date().getFullYear();

  // Filter transactions for the target year
  const yearTransactions = transactions.filter(t => {
    const tradeDate = new Date(t.tradeOpenDate);
    return tradeDate.getFullYear() === targetYear;
  });

  if (yearTransactions.length === 0) {
    return { annualizedRoR: 0, activeTradingDays: 0, baseRoR: 0 };
  }

  const baseRoR = calculatePortfolioRoR(yearTransactions);
  const activeTradingDays = calculateActiveTradingDays(yearTransactions);
  const annualizedRoR = activeTradingDays > 0 ? baseRoR * (365 / activeTradingDays) : baseRoR;

  return { annualizedRoR, activeTradingDays, baseRoR };
}
