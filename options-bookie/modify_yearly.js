const fs = require('fs');
let content = fs.readFileSync('src/components/analytics/YearlySummaryCard.tsx', 'utf8');

// 1. Wrap yearStrategyPerformance in useMemo
content = content.replace(
  'const yearStrategyPerformance = calculateStrategyPerformance(yearTransactions, chains);',
  'const yearStrategyPerformance = useMemo(() => calculateStrategyPerformance(yearTransactions, chains), [yearTransactions, chains]);'
);

// 2. Wrap stock performance calculation in useMemo
const oldStockCode = `  // Calculate best stock by P&L and RoR for this year
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
    .sort((a, b) => b.ror - a.ror)[0];`;

const newStockCode = `  // Calculate best stock by P&L and RoR for this year
  const { bestStockByPnL, bestStockByRoR } = useMemo(() => {
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

    const byPnL = Array.from(stockPerformance.entries())
      .sort((a, b) => b[1].pnl - a[1].pnl)[0];

    const byRoR = Array.from(stockPerformance.entries())
      .map(([ticker, data]) => ({
        ticker,
        ror: data.totalCollateral > 0 ? (data.pnl / data.totalCollateral * 100) : 0
      }))
      .sort((a, b) => b.ror - a.ror)[0];

    return { bestStockByPnL: byPnL, bestStockByRoR: byRoR };
  }, [realizedTransactions]);`;

content = content.replace(oldStockCode, newStockCode);

// 3. Wrap yearlyRoRData in useMemo
content = content.replace(
  'const yearlyRoRData = calculateYearlyAnnualizedRoRWithActiveMonths(yearTransactions, chains, yearData.year);',
  'const yearlyRoRData = useMemo(() => calculateYearlyAnnualizedRoRWithActiveMonths(yearTransactions, chains, yearData.year), [yearTransactions, chains, yearData.year]);'
);

// 4. Wrap quickStatsData in useMemo
const oldQuickStats = `  const quickStatsData = {
    totalPnL,
    totalTrades,
    winRate,
    avgRoR: yearlyRoRData.baseRoR,
    annualizedRoR: yearlyRoRData.annualizedRoR,
    activeTradingDays: yearlyRoRData.activeTradingDays,
    bestStrategy: yearStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStockByPnL ? { ticker: bestStockByPnL[0], pnl: bestStockByPnL[1].pnl } : null,
    bestStockByRoR: bestStockByRoR ? { ticker: bestStockByRoR.ticker, ror: bestStockByRoR.ror } : null
  };`;

const newQuickStats = `  const quickStatsData = useMemo(() => ({
    totalPnL,
    totalTrades,
    winRate,
    avgRoR: yearlyRoRData.baseRoR,
    annualizedRoR: yearlyRoRData.annualizedRoR,
    activeTradingDays: yearlyRoRData.activeTradingDays,
    bestStrategy: yearStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
      ? { name: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].strategy, ror: yearStrategyPerformance.filter(s => s.realizedCount > 0)[0].avgRoR }
      : null,
    bestStockByPnL: bestStockByPnL ? { ticker: bestStockByPnL[0], pnl: bestStockByPnL[1].pnl } : null,
    bestStockByRoR: bestStockByRoR ? { ticker: bestStockByRoR.ticker, ror: bestStockByRoR.ror } : null
  }), [totalPnL, totalTrades, winRate, yearlyRoRData, yearStrategyPerformance, bestStockByPnL, bestStockByRoR]);`;

content = content.replace(oldQuickStats, newQuickStats);

// Write changes
fs.writeFileSync('src/components/analytics/YearlySummaryCard.tsx', content);
console.log('Successfully updated YearlySummaryCard.tsx');
