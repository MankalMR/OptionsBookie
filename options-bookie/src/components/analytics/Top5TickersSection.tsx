'use client';

import { formatPnLCurrency } from '@/utils/optionsCalculations';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface TickerData {
  ticker: string;
  pnl: number;
  ror: number;
  trades: number;
}

interface Top5TickersSectionProps {
  yearTop5Tickers: TickerData[];
}

export default function Top5TickersSection({ yearTop5Tickers }: Top5TickersSectionProps) {
  const formatCurrency = formatPnLCurrency;

  if (yearTop5Tickers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t">
      <h5 className="text-lg font-medium text-card-foreground mb-4">Top 5 Tickers</h5>

      {/* Top 5 Tickers Summary */}
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

      {/* Ticker Performance Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={yearTop5Tickers.map((tickerData, index) => ({
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
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Rank</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Ticker</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">P&L</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">RoR</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Trades</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {yearTop5Tickers.map((tickerData, index) => (
              <tr key={tickerData.ticker}>
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
                <td className={`px-4 py-2 text-sm font-medium ${
                  tickerData.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(tickerData.pnl)}
                </td>
                <td className={`px-4 py-2 text-sm font-medium ${
                  tickerData.ror >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {tickerData.ror.toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-sm text-card-foreground">
                  {tickerData.trades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

