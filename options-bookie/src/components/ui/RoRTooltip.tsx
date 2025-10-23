import React from 'react';
import { getRoRColorClasses } from '@/utils/optionsCalculations';

interface RoRTooltipProps {
  /** The displayed (rounded) RoR value */
  displayValue: number;
  /** The precise RoR value to show in tooltip */
  preciseValue: number;
  /** Optional annualized RoR values */
  annualized?: {
    displayValue: number;
    preciseValue: number;
  };
  /** Text size class */
  size?: 'sm' | 'base' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the % symbol */
  showPercent?: boolean;
  /** Custom tooltip content */
  customTooltip?: string;
}

export default function RoRTooltip({
  displayValue,
  preciseValue,
  annualized,
  size = 'base',
  className = '',
  showPercent = true,
  customTooltip
}: RoRTooltipProps) {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const colorClasses = annualized
    ? getRoRColorClasses(preciseValue, annualized.preciseValue)
    : getRoRColorClasses(preciseValue);

  const getTooltipContent = () => {
    if (customTooltip) return customTooltip;

    if (annualized) {
      return `Precise Ann. RoR: ${annualized.preciseValue.toFixed(3)}% | Formula: (${preciseValue.toFixed(3)}% × 365) ÷ 30`;
    }

    return `Precise RoR: ${preciseValue.toFixed(6)}%`;
  };

  return (
    <span
      className={`${sizeClasses[size]} font-bold ${colorClasses} cursor-help ${className}`}
      title={getTooltipContent()}
    >
      {Math.round(displayValue)}{showPercent ? '%' : ''}
    </span>
  );
}

// Convenience component for regular RoR
export function RegularRoRTooltip({
  displayValue,
  preciseValue,
  showFormula = true,
  size = 'base',
  className = ''
}: {
  displayValue: number;
  preciseValue: number;
  showFormula?: boolean;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}) {
  const getTooltipContent = () => {
    if (showFormula) {
      return `Precise RoR: ${preciseValue.toFixed(6)}% | Formula: (Total P&L ÷ Total Capital) × 100`;
    }
    return `Precise RoR: ${preciseValue.toFixed(6)}%`;
  };

  return (
    <RoRTooltip
      displayValue={displayValue}
      preciseValue={preciseValue}
      size={size}
      className={className}
      customTooltip={getTooltipContent()}
    />
  );
}

// Convenience component for annualized RoR
export function AnnualizedRoRTooltip({
  displayValue,
  preciseValue,
  baseRoR,
  context = 'yearly',
  calculationMethod = 'time-period',
  activeDays,
  size = 'base',
  className = ''
}: {
  displayValue: number;
  preciseValue: number;
  baseRoR: number;
  context?: 'monthly' | 'yearly' | 'all-time';
  calculationMethod?: 'time-period' | 'trade-weighted';
  activeDays?: number;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}) {
  const getFormulaText = () => {
    if (calculationMethod === 'trade-weighted') {
      return `Weighted avg of (Trade RoR × 365 ÷ Days Held) by capital`;
    }

    switch (context) {
      case 'monthly':
        return `(${baseRoR.toFixed(3)}% × 365) ÷ 30`;
      case 'yearly':
        return activeDays
          ? `(${baseRoR.toFixed(3)}% × 365) ÷ ${activeDays} active trading days`
          : `(${baseRoR.toFixed(3)}% × 365) ÷ 365 = ${baseRoR.toFixed(3)}%`;
      case 'all-time':
        return activeDays
          ? `(${baseRoR.toFixed(3)}% × 365) ÷ ${activeDays} total days since inception`
          : `(${baseRoR.toFixed(3)}% × 365) ÷ Total Days since inception`;
      default:
        return `(${baseRoR.toFixed(3)}% × 365) ÷ 365`;
    }
  };

  return (
    <RoRTooltip
      displayValue={displayValue}
      preciseValue={preciseValue}
      annualized={{
        displayValue,
        preciseValue
      }}
      size={size}
      className={className}
      customTooltip={`Precise Ann. RoR: ${preciseValue.toFixed(3)}% | Formula: ${getFormulaText()}`}
    />
  );
}
