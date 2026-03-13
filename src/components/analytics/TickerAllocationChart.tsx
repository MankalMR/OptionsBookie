'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatPnLCurrency } from '@/utils/optionsCalculations';

interface TickerAllocation {
  [key: string]: string | number;
  ticker: string;
  totalCollateral: number;
  percentage: number;
}

interface TickerAllocationChartProps {
  data: TickerAllocation[];
}

const COLORS = [
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#84cc16'  // lime-500
];

const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: { payload: TickerAllocation }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover text-popover-foreground border rounded-md shadow-md p-3">
        <p className="font-semibold text-base mb-1">{data.ticker}</p>
        <p className="text-sm">
          <span className="text-muted-foreground mr-2">Collateral:</span>
          <span className="font-medium">{formatPnLCurrency(data.totalCollateral)}</span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground mr-2">Allocation:</span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TickerAllocationChart({ data }: TickerAllocationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
        No active positions to analyze.
      </div>
    );
  }

  // Handle case where all collaterals are 0 but we have open positions
  const totalCollateral = data.reduce((sum, item) => sum + item.totalCollateral, 0);
  if (totalCollateral === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">
        Active positions have $0 total collateral.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="totalCollateral"
            nameKey="ticker"
            label={({ ticker, percentage }) => `${ticker} (${(percentage as number).toFixed(0)}%)`}
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}