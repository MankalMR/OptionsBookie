'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Heart } from 'lucide-react';
import type { EtfSearchResult } from '@/types/etf';

interface EtfSearchBarProps {
  results: EtfSearchResult[];
  loading: boolean;
  onSearch: (query: string) => void;
  onSelect: (ticker: string) => void;
  onToggleSave: (ticker: string, isSaved: boolean) => void;
}

export default function EtfSearchBar({
  results,
  loading,
  onSearch,
  onSelect,
  onToggleSave,
}: EtfSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        onSearch(query.trim());
      }, 400);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  useEffect(() => {
    setShowDropdown(results.length > 0 && query.trim().length > 0);
  }, [results, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ticker: string) => {
    setShowDropdown(false);
    setQuery(ticker);
    onSelect(ticker);
  };

  const handleSaveClick = (e: React.MouseEvent, ticker: string, isSaved: boolean) => {
    e.stopPropagation();
    onToggleSave(ticker, isSaved);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ETF ticker or name..."
          className="pl-10"
          onFocus={() => {
            if (results.length > 0 && query.trim().length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {showDropdown && (
        <div role="listbox" className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-64 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.ticker}
              role="option"
              tabIndex={0}
              onClick={() => handleSelect(result.ticker)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(result.ticker); } }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold shrink-0">{result.ticker}</span>
                {result.fundName && (
                  <span className="text-muted-foreground truncate">{result.fundName}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
