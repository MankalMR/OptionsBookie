'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OptionsTransaction } from '@/types/options';
import { calculateTickerAllocation, formatPnLCurrency } from '@/utils/optionsCalculations';
import TickerAllocationChart from './TickerAllocationChart';

interface CurrentRiskTabProps {
  transactions: OptionsTransaction[];
  selectedPortfolioName?: string | null;
}

export default function CurrentRiskTab({ transactions, selectedPortfolioName }: CurrentRiskTabProps) {
  const allocationData = useMemo(() => calculateTickerAllocation(transactions), [transactions]);

  const totalActiveCollateral = useMemo(() => {
    return allocationData.reduce((sum, item) => sum + item.totalCollateral, 0);
  }, [allocationData]);

  const openTradesCount = useMemo(() => transactions.filter(t => t.status === 'Open').length, [transactions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Analytics</h2>
          <p className="text-muted-foreground">
            {selectedPortfolioName
              ? `Current risk profile for ${selectedPortfolioName}`
              : 'Current risk profile across all portfolios'}
          </p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border shadow-sm">
          <div className="text-sm text-muted-foreground">Total Active Collateral</div>
          <div className="text-xl font-bold text-foreground">
            {formatPnLCurrency(totalActiveCollateral)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Underlying Asset Exposure</CardTitle>
            <CardDescription>
              Capital allocation across active tickers ({openTradesCount} open trades)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openTradesCount === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
                <p>No active positions.</p>
                <p className="text-sm mt-2">Open new trades to see your current risk allocation.</p>
              </div>
            ) : (
              <TickerAllocationChart data={allocationData} />
            )}
          </CardContent>
        </Card>

        {/* Can be extended later with more active risk analytics, like Greeks or timeframe risks */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Concentration Breakdown</CardTitle>
            <CardDescription>
              Detailed view of capital deployment per underlying
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openTradesCount === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
                <p>No data available.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {allocationData.map((item) => (
                  <div key={item.ticker} className="flex justify-between items-center pb-2 border-b last:border-0 border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{item.ticker}</div>
                      <div className="text-sm text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 border">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatPnLCurrency(item.totalCollateral)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}