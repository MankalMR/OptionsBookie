'use client';

import { useState } from 'react';
import EtfSearchBar from './EtfSearchBar';
import EtfsList from './EtfsList';
import { useEtfSearch } from '@/hooks/useEtfSearch';

export default function AnalyzeEtfsTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { results, loading, search, clearResults } = useEtfSearch();

  const handleSelect = async (ticker: string) => {
    // When a ticker is selected, it hits the [ticker] API route which records the view.
    // We trigger a refresh of the unified list to show the new item at the top.
    
    // First, we trigger the search API to ensure it's recorded/cached
    try {
      await fetch(`/api/etfs/${ticker}`);
      setRefreshKey(prev => prev + 1);
      clearResults();
    } catch (err) {
      console.error('Error selecting ETF:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border/40 pb-6">
        <div className="w-full md:w-96">
          <EtfSearchBar 
            results={results}
            loading={loading}
            onSearch={search}
            onSelect={handleSelect}
          />
        </div>
      </div>

      <EtfsList 
        refreshKey={refreshKey} 
        onRefresh={() => setRefreshKey(prev => prev + 1)} 
      />
    </div>
  );
}
