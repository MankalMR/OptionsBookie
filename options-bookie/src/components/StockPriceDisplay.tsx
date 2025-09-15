'use client';

import { StockPrice } from '@/hooks/useStockPrices';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StockPriceDisplayProps {
  symbol: string;
  stockPrice: StockPrice | null;
  strikePrice: number;
  loading?: boolean;
  onRefresh?: () => void;
  showComparison?: boolean;
}

// Simple ITM indicator component for use next to strike price
export function ITMIndicator({
  currentPrice,
  strikePrice,
  optionType
}: {
  currentPrice: number;
  strikePrice: number;
  optionType: 'Call' | 'Put';
}) {
  // Calculate ITM based on option type
  let isInTheMoney = false;

  if (optionType === 'Call') {
    // Call is ITM when current price > strike price
    isInTheMoney = currentPrice > strikePrice;
  } else if (optionType === 'Put') {
    // Put is ITM when current price < strike price
    isInTheMoney = currentPrice < strikePrice;
  }

  // Only show indicator when in-the-money
  if (!isInTheMoney) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      ITM
    </span>
  );
}

export default function StockPriceDisplay({
  symbol,
  stockPrice,
  strikePrice,
  loading = false,
  onRefresh,
  showComparison = true
}: StockPriceDisplayProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getPriceComparison = (currentPrice: number, strikePrice: number) => {
    const difference = currentPrice - strikePrice;
    const percentDifference = (difference / strikePrice) * 100;

    return {
      difference,
      percentDifference,
      isInTheMoney: difference > 0,
      isOutOfTheMoney: difference < 0,
      isAtTheMoney: Math.abs(difference) < (strikePrice * 0.01)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Loading price...</span>
      </div>
    );
  }

  if (!stockPrice) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Price unavailable</span>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const comparison = showComparison ? getPriceComparison(stockPrice.price, strikePrice) : null;

  return (
    <div className="flex flex-col">
      <span className="font-medium">{formatPrice(stockPrice.price)}</span>
      <div className={`flex items-center space-x-1 text-xs ${
        stockPrice.change >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {stockPrice.change >= 0 ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" />
        )}
        <span className="text-xs">{formatChange(stockPrice.change, stockPrice.changePercent)}</span>
      </div>
    </div>
  );
}
