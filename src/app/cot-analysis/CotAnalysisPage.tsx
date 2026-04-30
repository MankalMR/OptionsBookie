'use client';

import AppHeader from '@/components/AppHeader';
import CotAnalysisTab from '@/components/analytics/CotAnalysisTab';

export default function CotAnalysisPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CotAnalysisTab />
      </main>
    </div>
  );
}
