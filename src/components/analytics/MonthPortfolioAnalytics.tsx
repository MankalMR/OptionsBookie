'use client';

import React from 'react';

interface MonthPortfolioAnalyticsProps {
  children: React.ReactNode;
  month: string; // e.g., "Sep 2025"
  selectedPortfolioName?: string | null;
}

export default function MonthPortfolioAnalytics({
  children,
  month,
  selectedPortfolioName
}: MonthPortfolioAnalyticsProps) {
  const portfolioText = selectedPortfolioName || 'All Portfolios';

  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <div className="flex justify-end mb-8">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          {month} • {portfolioText}
        </span>
      </div>

      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}
