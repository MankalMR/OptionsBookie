'use client';

import React, { useState } from 'react';
import { formatPnLCurrency, calculateCollateral } from '@/utils/optionsCalculations';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { OptionsTransaction, TradeChain } from '@/types/options';
import TransactionsTable from './TransactionsTable';
import { RegularRoRTooltip, AnnualizedRoRTooltip } from '@/components/ui/RoRTooltip';

interface TickerData {
  ticker: string;
  pnl: number;
  ror: number;
  trades: number;
  totalCollateral: number;
  annualizedRoR: number;
}

interface Top5TickersSectionProps {
  yearTop5Tickers: TickerData[];
  yearAllTickers: TickerData[];
  yearTransactions: OptionsTransaction[];
  chains: TradeChain[];
}

export default function Top5TickersSection({ yearTop5Tickers, yearAllTickers, yearTransactions, chains }: Top5TickersSectionProps) {
  const formatCurrency = formatPnLCurrency;
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  if (yearTop5Tickers.length === 0) {
    return null;
  }

  // Determine which tickers to display: collapsed = top 5, expanded = all
  const tickersToDisplay = isExpanded ? yearAllTickers : yearTop5Tickers;

  // Toggle ticker expansion
  const toggleTicker = (ticker: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  };

  return (
    <div className="bg-muted/20 rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-card-foreground">Top Stocks</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Top 5
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              {yearAllTickers.length > 5 ? `Show All (${yearAllTickers.length})` : 'Show Details'}
            </>
          )}
        </button>
      </div>

      {/* Top 5 Tickers Summary - Always visible */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {yearTop5Tickers.map((tickerData, index) => (
            <div
              key={tickerData.ticker}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `hsl(${(index * 72) % 360} 60% 85%)`,
                color: `hsl(${(index * 72) % 360} 70% 25%)`
              }}
            >
              #{index + 1} {tickerData.ticker} ({formatCurrency(tickerData.pnl)})
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Details - Chart and Table */}
      {isExpanded && (
        <div className="space-y-6">
          {/* Ticker Performance Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={tickersToDisplay.map((tickerData, index) => ({
                  ticker: tickerData.ticker,
                  pnl: tickerData.pnl,
                  ror: tickerData.ror,
                  trades: tickerData.trades,
                  color: `hsl(${(index * 72) % 360} 60% 50%)`
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="ticker"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="pnl"
                  orientation="left"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  yAxisId="ror"
                  orientation="right"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'pnl') return [`$${value}`, 'P&L'];
                    if (name === 'ror') return [`${value}%`, 'RoR'];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'hsl(var(--card-foreground))' }}
                />

                {/* P&L Bars */}
                <Bar
                  yAxisId="pnl"
                  dataKey="pnl"
                  fill="hsl(160 60% 45%)"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name="P&L ($)"
                />

                {/* RoR Bars */}
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

          {/* Ticker Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-12"></th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Ticker</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Trades</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">P&L / Capital<br />RoR / Ann. RoR</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {tickersToDisplay.map((tickerData, index) => (
                  <React.Fragment key={tickerData.ticker}>
                    <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleTicker(tickerData.ticker)}>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTicker(tickerData.ticker);
                          }}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
                        >
                          {expandedTickers.has(tickerData.ticker) ? (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-card-foreground">#{index + 1}</td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `hsl(${(index * 72) % 360} 60% 85%)`,
                            color: `hsl(${(index * 72) % 360} 70% 25%)`
                          }}
                        >
                          {tickerData.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-card-foreground">
                        {tickerData.trades}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-col space-y-1 items-end">
                          <span className="text-xs">
                            <span className={`${tickerData.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(tickerData.pnl)}
                            </span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-red-600 dark:text-red-400">
                              {formatCurrency(tickerData.totalCollateral)}
                            </span>
                          </span>
                          <span className="text-xs flex items-center space-x-1">
                            <RegularRoRTooltip
                              displayValue={tickerData.ror}
                              preciseValue={tickerData.ror}
                              size="sm"
                            />
                            <span className="text-muted-foreground"> / </span>
                            <AnnualizedRoRTooltip
                              displayValue={tickerData.annualizedRoR}
                              preciseValue={tickerData.annualizedRoR}
                              baseRoR={tickerData.ror}
                              context="yearly"
                              size="sm"
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                    {expandedTickers.has(tickerData.ticker) && (
                      <tr>
                        <td colSpan={5} className="p-0 bg-muted/10 border-l-4 border-sky-500/30">
                          <TransactionsTable
                            transactions={yearTransactions.filter(t => t.stockSymbol === tickerData.ticker)}
                            chains={chains}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

