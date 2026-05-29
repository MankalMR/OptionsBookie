'use client';

import AppHeader from '@/components/AppHeader';
import AnalyzeEtfsTab from '@/components/analytics/AnalyzeEtfsTab';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AnalyzeEtfsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnalyzeEtfsTab />
        </main>
      </div>
    </ProtectedRoute>
  );
}
