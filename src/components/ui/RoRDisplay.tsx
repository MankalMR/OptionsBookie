import React from 'react';
import { getRoRColorClasses } from '@/utils/optionsCalculations';

interface RoRDisplayProps {
  ror: number;
  annualizedRoR?: number;
  size?: 'sm' | 'base' | 'lg';
  className?: string;
  showLabel?: boolean;
  labelSize?: 'xs' | 'sm';
  overrideColors?: boolean; // When true, use className colors instead of automatic RoR colors
}

export default function RoRDisplay({
  ror,
  annualizedRoR,
  size = 'base',
  className = '',
  showLabel = false,
  labelSize = 'xs',
  overrideColors = false
}: RoRDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    base: 'text-base font-bold',
    lg: 'text-lg font-bold'
  };

  const labelSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm'
  };

  const formatRoR = (value: number): string => {
    return isFinite(value) ? `${value.toFixed(1)}%` : '-';
  };

  const displayValue = annualizedRoR !== undefined
    ? `${formatRoR(ror)} / ${formatRoR(annualizedRoR)}`
    : formatRoR(ror);

  const labelText = annualizedRoR !== undefined
    ? 'Avg RoR / Ann. RoR'
    : 'RoR';

  const colorClasses = overrideColors ? className : getRoRColorClasses(ror, annualizedRoR);

  return (
    <div className="flex flex-col">
      <span className={`${sizeClasses[size]} ${colorClasses} leading-tight`}>
        {displayValue}
      </span>
      {showLabel && (
        <div className={`${labelSizeClasses[labelSize]} text-muted-foreground`}>
          {labelText}
        </div>
      )}
    </div>
  );
}
