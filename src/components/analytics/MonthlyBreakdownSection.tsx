'use client';

import React, { useState } from 'react';
import { formatPnLCurrency, getRealizedTransactions, calculateDaysHeld, calculateStrategyPerformance, calculateMonthlyAnnualizedRoR, getEffectiveCloseDate, calculateSmartCapital } from '@/utils/optionsCalculations';
import { getSyncDomains } from '@/utils/chartUtils';
import { RegularRoRTooltip, AnnualizedRoRTooltip } from '@/components/ui/RoRTooltip';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { ChevronDown, ChevronRight, Plus, Minus, Sparkles, X, Loader2 } from 'lucide-react';
import { OptionsTransaction, TradeChain, AIFilter } from '@/types/options';
import TransactionsTable from './TransactionsTable';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MonthlyData {
  month: number;
  monthName: string;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  fees: number;
}

interface TopTickers {
  topByPnL: { ticker: string; pnl: number };
  topByRoR: { ticker: string; ror: number };
}

interface ChartDataPoint {
  month: string;
  pnl: number;
  ror: number;
}

interface MonthlyBreakdownSectionProps {
  yearData: {
    year: number;
    monthlyBreakdown: MonthlyData[];
  };
  chartData: ChartDataPoint[];
  getTopTickersForMonth: (year: number, month: number) => TopTickers | undefined;
  transactions: OptionsTransaction[]; // Add transactions for drill-down
  chains?: TradeChain[]; // Add chains for chain-aware filtering
  selectedPortfolioName?: string | null;
}

export default function MonthlyBreakdownSection({
  yearData,
  chartData,
  getTopTickersForMonth,
  transactions,
  chains = [],
  selectedPortfolioName
}: MonthlyBreakdownSectionProps) {
  const isMobile = useIsMobile();

  // No months expanded by default - user must explicitly click to expand
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  // Chart collapsed by default - user must explicitly click to expand
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  const toggleMonth = (month: number) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  // AI Filter State
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiFilters, setAiFilters] = useState<AIFilter | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchQuery.trim()) return;

    setIsAILoading(true);
    setAiError('');

    try {
      const res = await fetch('/api/ai/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiSearchQuery })
      });

      if (!res.ok) {
        throw new Error('Failed to parse query');
      }

      const data = await res.json();
      if (data.filter && data.filter.unavailable) {
        setAiError('AI filtering is currently unavailable. Please check the API configuration.');
        setAiFilters(null);
      } else if (data.filter && Object.keys(data.filter).length > 0) {
        setAiFilters(data.filter);
        // Automatically expand all months when a filter is applied to make it easier to see results
        const allMonths = new Set(yearData.monthlyBreakdown.map(m => m.month));
        setExpandedMonths(allMonths);
      } else {
        setAiError('Could not understand the query. Please try again.');
        setAiFilters(null);
      }
    } catch (err) {
      setAiError('AI service is temporarily unavailable. Please use manual filters.');
      setAiFilters(null);
    } finally {
      setIsAILoading(false);
    }
  };

  const clearAIFilters = () => {
    setAiSearchQuery('');
    setAiFilters(null);
    setAiError('');
    setExpandedMonths(new Set()); // Collapse all when cleared
  };

  // Helper function to get chain-aware P&L for filtering
  const getDisplayPnL = (transaction: OptionsTransaction): number => {
    if (transaction.chainId) {
      const chain = chains.find((c: TradeChain) => c.id === transaction.chainId);
      if (chain && chain.chainStatus === 'Closed') {
        // Simple recalculation here for filtering purposes.
        return transactions
          .filter(t => t.chainId === transaction.chainId)
          .reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      }
    }
    return transaction.profitLoss || 0;
  };

  // Pre-filter transactions based on AI criteria before grouping
  const aiFilteredTransactions = React.useMemo(() => {
    let filtered = transactions;

    if (aiFilters) {
      if (aiFilters.symbol) {
        filtered = filtered.filter(t => t.stockSymbol.toUpperCase() === aiFilters.symbol?.toUpperCase());
      }
      if (aiFilters.type) {
        filtered = filtered.filter(t => t.callOrPut === aiFilters.type);
      }
      if (aiFilters.action) {
        filtered = filtered.filter(t => t.buyOrSell === aiFilters.action);
      }
      if (aiFilters.status) {
        filtered = filtered.filter(t => t.status === aiFilters.status);
      }
      if (aiFilters.outcome) {
        filtered = filtered.filter(t => {
          const pnl = getDisplayPnL(t);
          if (aiFilters.outcome === 'win') return pnl > 0;
          if (aiFilters.outcome === 'loss') return pnl < 0;
          return true;
        });
      }

      if (aiFilters.timeframe) {
        const tf = aiFilters.timeframe.toLowerCase();
        const now = new Date();

        filtered = filtered.filter(t => {
          const tradeDate = getEffectiveCloseDate(t, transactions, chains);

          if (tf.includes('this year')) {
            return tradeDate.getFullYear() === now.getFullYear();
          } else if (tf.includes('last year')) {
            return tradeDate.getFullYear() === now.getFullYear() - 1;
          } else if (tf.includes('this month')) {
            return tradeDate.getFullYear() === now.getFullYear() && tradeDate.getMonth() === now.getMonth();
          } else if (tf.includes('last month')) {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return tradeDate.getFullYear() === lastMonth.getFullYear() && tradeDate.getMonth() === lastMonth.getMonth();
          } else if (tf.match(/\b20\d{2}\b/)) { // Match year like 2025
            const yearMatch = tf.match(/\b20\d{2}\b/);
            if (yearMatch) {
              return tradeDate.getFullYear() === parseInt(yearMatch[0]);
            }
          }
          return true;
        });
      }

      if (aiFilters.strategy) {
        const strategy = aiFilters.strategy.toLowerCase();

        filtered = filtered.filter(t => {
          if (strategy.includes('covered call')) {
            return t.buyOrSell === 'Sell' && t.callOrPut === 'Call';
          } else if (strategy.includes('cash-secured put') || strategy.includes('cash secured put') || strategy.includes('csp')) {
            return t.buyOrSell === 'Sell' && t.callOrPut === 'Put';
          } else if (strategy.includes('iron condor')) {
            // Simple check: part of a chain with 4 legs
            const chain = chains.find(c => c.id === t.chainId);
            return chain && chain.transactions && chain.transactions.length >= 4;
          } else if (strategy.includes('credit spread')) {
            const chain = chains.find(c => c.id === t.chainId);
            return chain && chain.transactions && chain.transactions.length === 2;
          } else if (strategy.includes('long') || strategy.includes('bought')) {
             return t.buyOrSell === 'Buy';
          } else if (strategy.includes('short') || strategy.includes('sold')) {
             return t.buyOrSell === 'Sell';
          }
          return true;
        });
      }
    }

    return filtered;
  }, [transactions, aiFilters, chains]);

  // Memoize realized transactions and group them by month to avoid O(N^2) filtering
  // on every render row where N is the total number of transactions.
  const transactionsByMonth = React.useMemo(() => {
    const realized = getRealizedTransactions(aiFilteredTransactions, chains).filter(t => t.closeDate);

    // Pre-calculate effective close date for all realized transactions
    const monthGroups = new Map<number, OptionsTransaction[]>();

    // Initialize map for all 12 months (0-11)
    for (let i = 0; i < 12; i++) {
      monthGroups.set(i, []);
    }

    realized.forEach(t => {
      const effectiveCloseDate = getEffectiveCloseDate(t, realized, chains);
      if (effectiveCloseDate.getFullYear() === yearData.year) {
        const month = effectiveCloseDate.getMonth();
        monthGroups.get(month)?.push(t);
      }
    });

    return monthGroups;
  }, [transactions, chains, yearData.year]);

  // Fast O(1) lookup for transactions by month
  const getMonthTransactions = (month: number): OptionsTransaction[] => {
    return transactionsByMonth.get(month) || [];
  };

  const chartPnlValues = chartData?.map(d => d.pnl) || [];
  const chartRorValues = chartData?.map(d => d.ror) || [];
  const { pnlDomain, rorDomain } = getSyncDomains(chartPnlValues, chartRorValues);

  const formatCurrency = formatPnLCurrency;

  return (
    <div className="bg-muted/20 rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-card-foreground">Monthly Breakdown</h3>
        <button
          onClick={() => setIsChartExpanded(!isChartExpanded)}
          className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded px-1"
          aria-expanded={isChartExpanded}
        >
          {isChartExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Hide Chart
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              Show Chart
            </>
          )}
        </button>
      </div>

      {isChartExpanded && (() => {
        return chartData && chartData.length > 0 ? (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="pnl"
                  orientation="left"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value: number) => {
                    const rounded = Math.round(value / 10) * 10;
                    return rounded < 0 ? `-$${Math.abs(rounded)}` : `$${rounded}`;
                  }}
                  domain={pnlDomain}
                  tickCount={5}
                />
                <YAxis
                  yAxisId="ror"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value: number) => `${Math.round(value)}%`}
                  domain={rorDomain}
                  tickCount={5}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const month = label;
                      const pnlValue = payload.find(p => p.dataKey === 'pnl')?.value || 0;
                      const rorValue = payload.find(p => p.dataKey === 'ror')?.value || 0;

                      // Find top tickers for this month
                      const monthDate = new Date(month + ' 1');
                      const topTickers = getTopTickersForMonth(monthDate.getFullYear(), monthDate.getMonth());

                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-popover-foreground mb-2">{month}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-600 dark:text-emerald-400">P&L:</span>
                              <span className="font-medium">
                                {pnlValue < 0 ? `-$${Math.abs(Math.round(pnlValue))}` : `$${Math.round(pnlValue)}`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sky-600 dark:text-sky-400">RoR:</span>
                              <span className="font-medium">{(rorValue as number).toFixed(1)}%</span>
                            </div>
                            {topTickers && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Top by P&L:</span>
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{topTickers.topByPnL.ticker}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">Top by RoR:</span>
                                  <span className="font-medium text-sky-600 dark:text-sky-400">{topTickers.topByRoR.ticker}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'hsl(var(--card-foreground))' }}
                />
                <Bar
                  yAxisId="pnl"
                  dataKey="pnl"
                  fill="hsl(160 60% 40%)"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name="P&L ($)"
                />
                <Bar
                  yAxisId="ror"
                  dataKey="ror"
                  fill="hsl(210 60% 55%)"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name="RoR (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-6 text-center py-4 text-muted-foreground">
            <p>No chart data available for {yearData.year}</p>
          </div>
        );
      })()}

      {/* AI Filter Search Bar */}
      <div className="space-y-3 mb-6">
        <form onSubmit={handleAISearch} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xl">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              type="text"
              placeholder="Ask AI to filter... (e.g., 'Show me all losing puts on AAPL')"
              value={aiSearchQuery}
              onChange={(e) => setAiSearchQuery(e.target.value)}
              className="pl-9 pr-4 bg-background"
              disabled={isAILoading}
            />
          </div>
          <Button type="submit" disabled={isAILoading || !aiSearchQuery.trim()}>
            {isAILoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Filter
          </Button>
          {aiFilters && (
            <Button type="button" variant="outline" onClick={clearAIFilters}>
              Clear
            </Button>
          )}
        </form>

        {/* AI Error Message */}
        {aiError && (
          <p className="text-sm text-destructive">{aiError}</p>
        )}

        {/* Active AI Filters Badges */}
        {aiFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">AI Filters:</span>
            {aiFilters.symbol && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Symbol: {aiFilters.symbol.toUpperCase()}
              </Badge>
            )}
            {aiFilters.type && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Type: {aiFilters.type}
              </Badge>
            )}
            {aiFilters.action && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Action: {aiFilters.action}
              </Badge>
            )}
            {aiFilters.outcome && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Outcome: {aiFilters.outcome}
              </Badge>
            )}
            {aiFilters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {aiFilters.status}
              </Badge>
            )}
            {aiFilters.timeframe && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Timeframe: {aiFilters.timeframe}
              </Badge>
            )}
            {aiFilters.strategy && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Strategy: {aiFilters.strategy}
              </Badge>
            )}
            <button
              onClick={clearAIFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-2 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear AI Filters
            </button>
          </div>
        )}
      </div>

      {/* Monthly Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Month</th>
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Trades</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Avg Days</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Win Rate</th>}
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top Strategy</th>}
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top by P&L</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Top by RoR</th>
              {!isMobile && <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fees</th>}
              {!isMobile && (
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  <div className="flex flex-col">
                    <span>P&L / Capital</span>
                    <span className="text-xs">RoR / Ann. RoR</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-card">
            {yearData.monthlyBreakdown.map((month) => {
              const topTickers = getTopTickersForMonth(yearData.year, month.month);
              const isExpanded = expandedMonths.has(month.month);
              const monthTransactions = getMonthTransactions(month.month);
              const hasTransactions = monthTransactions.length > 0;

              // Calculate additional metrics for this month
              // monthTransactions is already chain-aware and realized from getMonthTransactions
              // Use smart capital calculation (overlap-aware) for monthly views
              const capitalResult = calculateSmartCapital(monthTransactions, chains);
              const totalCollateral = capitalResult.totalCapital;

              const totalPnL = monthTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
              const avgRoR = totalCollateral > 0 ? (totalPnL / totalCollateral * 100) : 0;
              const avgAnnualizedRoR = calculateMonthlyAnnualizedRoR(avgRoR);
              const avgDays = monthTransactions.length > 0
                ? monthTransactions.reduce((sum, t) => sum + calculateDaysHeld(t.tradeOpenDate, t.closeDate!), 0) / monthTransactions.length
                : 0;
              const monthStrategyPerformance = calculateStrategyPerformance(monthTransactions, chains);
              const bestStrategy = monthStrategyPerformance.filter(s => s.realizedCount > 0).length > 0
                ? monthStrategyPerformance.filter(s => s.realizedCount > 0)[0]
                : null;

              return (
                <React.Fragment key={month.month}>
                  <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-sm font-medium text-card-foreground">
                      <div className="flex items-center gap-2">
                        {hasTransactions && (
                          <button
                            onClick={() => toggleMonth(month.month)}
                            className="p-0.5 hover:bg-muted rounded transition-colors"
                            title={isExpanded ? 'Collapse trades' : 'Expand trades'}
                          >
                            {isExpanded ? (
                              <Minus className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Plus className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <span>{month.monthName}</span>
                      </div>
                    </td>
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{month.totalTrades}</td>}
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{Math.round(avgDays)}</td>}
                    {!isMobile && <td className="px-4 py-2 text-sm text-card-foreground">{Math.round(month.winRate)}%</td>}
                    {!isMobile && (
                      <td className="px-4 py-2 text-sm">
                        {bestStrategy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                            {bestStrategy.strategy} ({bestStrategy.avgRoR.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm">
                      {topTickers ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200">
                          {topTickers.topByPnL.ticker} ({formatCurrency(topTickers.topByPnL.pnl)})
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {topTickers ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200">
                          {topTickers.topByRoR.ticker} ({topTickers.topByRoR.ror.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    {!isMobile && <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{formatCurrency(month.fees)}</td>}
                    {!isMobile && (
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs">
                            <span className={`${month.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(month.totalPnL)}
                            </span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-red-600 dark:text-red-400">
                              {formatCurrency(totalCollateral)}
                            </span>
                          </span>
                          <span className="text-xs flex items-center space-x-1">
                            <RegularRoRTooltip
                              displayValue={avgRoR}
                              preciseValue={avgRoR}
                              size="sm"
                            />
                            <span className="text-muted-foreground"> / </span>
                            <AnnualizedRoRTooltip
                              displayValue={avgAnnualizedRoR}
                              preciseValue={avgAnnualizedRoR}
                              baseRoR={avgRoR}
                              context="monthly"
                              size="sm"
                            />
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded trades table */}
                  {isExpanded && hasTransactions && (
                    <tr>
                      <td colSpan={isMobile ? 3 : 9} className="p-0">
                        <TransactionsTable
                          transactions={monthTransactions}
                          chains={chains}
                          monthName={month.monthName}
                          selectedPortfolioName={selectedPortfolioName}
                          aiFilters={aiFilters}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

