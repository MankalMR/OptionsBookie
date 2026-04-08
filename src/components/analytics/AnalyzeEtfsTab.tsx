'use client';

import { useState, useCallback } from 'react';
import EtfSearchBar from './EtfSearchBar';
import EtfDetailCard from './EtfDetailCard';
import SavedEtfsList from './SavedEtfsList';
import { useEtfSearch } from '@/hooks/useEtfSearch';
import { useEtfProfile } from '@/hooks/useEtfProfile';
import { useSavedEtfs } from '@/hooks/useSavedEtfs';

export default function AnalyzeEtfsTab() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { results, loading: searchLoading, search, clearResults } = useEtfSearch();
  const { profile, loading: profileLoading, error: profileError } = useEtfProfile(selectedTicker);
  const { savedEtfs, loading: savedLoading, saveEtf, unsaveEtf, fetchSavedEtfs } = useSavedEtfs();

  const handleSelect = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    clearResults();
  }, [clearResults]);

  const handleToggleSaveFromSearch = useCallback(async (ticker: string, isSaved: boolean) => {
    if (isSaved) {
      await unsaveEtf(ticker);
    } else {
      await saveEtf(ticker);
    }
  }, [saveEtf, unsaveEtf]);

  const handleToggleSaveFromDetail = useCallback(async () => {
    if (!profile) return;
    if (profile.isSaved) {
      await unsaveEtf(profile.ticker);
    } else {
      await saveEtf(profile.ticker);
    }
    // Refresh saved list
    await fetchSavedEtfs();
  }, [profile, saveEtf, unsaveEtf, fetchSavedEtfs]);

  const handleUnsave = useCallback(async (ticker: string) => {
    await unsaveEtf(ticker);
  }, [unsaveEtf]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <EtfSearchBar
        results={results}
        loading={searchLoading}
        onSearch={search}
        onSelect={handleSelect}
        onToggleSave={handleToggleSaveFromSearch}
      />

      {/* Profile Detail */}
      {profileLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="ml-2 text-sm text-muted-foreground">Loading ETF profile...</span>
        </div>
      )}

      {profileError && (
        <div className="text-sm text-red-500 py-4">{profileError}</div>
      )}

      {profile && !profileLoading && (
        <EtfDetailCard
          profile={profile}
          onToggleSave={handleToggleSaveFromDetail}
        />
      )}

      {/* Saved ETFs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Saved ETFs</h2>
        <SavedEtfsList
          savedEtfs={savedEtfs}
          loading={savedLoading}
          onSelect={handleSelect}
          onUnsave={handleUnsave}
        />
      </div>
    </div>
  );
}
