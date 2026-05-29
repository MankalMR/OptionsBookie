'use client';

import React from 'react';

interface YearPortfolioAnalyticsProps {
  children: React.ReactNode;
  year: number;
  selectedPortfolioName?: string | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function YearPortfolioAnalytics({
  children,
  year,
  selectedPortfolioName,
  isExpanded = false,
  onToggle
}: YearPortfolioAnalyticsProps) {
  const portfolioText = selectedPortfolioName || 'All Portfolios';

  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-card-foreground">{year}</h3>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {year} • {portfolioText}
          </span>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium"
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-8">
          {children}
        </div>
      )}
    </div>
  );
}
