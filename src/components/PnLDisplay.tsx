'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPnLWithArrow } from '@/utils/optionsCalculations';

interface PnLDisplayProps {
  amount: number;
  className?: string;
  textSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  iconSize?: 'sm' | 'base' | 'lg';
  showZero?: boolean; // Whether to show arrows for zero values
}

const PnLDisplay = ({
  amount,
  className = '',
  textSize = 'base',
  iconSize = 'base',
  showZero = false
}: PnLDisplayProps) => {
  const pnlData = formatPnLWithArrow(amount);

  // Don't show arrows for zero values unless explicitly requested
  const shouldShowArrow = showZero || amount !== 0;

  const textSizeClass = {
    'sm': 'text-sm',
    'base': 'text-base',
    'lg': 'text-lg',
    'xl': 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  }[textSize];

  const iconSizeClass = {
    'sm': 'h-3 w-3',
    'base': 'h-4 w-4',
    'lg': 'h-6 w-6'
  }[iconSize];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {shouldShowArrow && (
        pnlData.isPositive ? (
          <TrendingUp className={`${iconSizeClass} text-green-600`} />
        ) : (
          <TrendingDown className={`${iconSizeClass} text-red-600`} />
        )
      )}
      <span className={`font-medium ${textSizeClass} ${pnlData.isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {pnlData.text}
      </span>
    </div>
  );
};

export default PnLDisplay;
