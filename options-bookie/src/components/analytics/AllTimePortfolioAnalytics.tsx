'use client';

import React from 'react';

interface AllTimePortfolioAnalyticsProps {
  children: React.ReactNode;
  selectedPortfolioName: string | null;
}

export default function AllTimePortfolioAnalytics({
  children,
  selectedPortfolioName
}: AllTimePortfolioAnalyticsProps) {
  const portfolioText = selectedPortfolioName || 'All Portfolios';

  return (
    <div className="bg-card rounded-lg shadow border p-6">
      <div className="flex justify-end mb-8">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          All Time ∞ • {portfolioText}
        </span>
      </div>

      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}
