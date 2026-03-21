'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronDown } from 'lucide-react';

interface TickerMultiSelectProps {
  availableTickers: string[];
  selectedTickers: string[];
  onTickerChange: (tickers: string[]) => void;
  className?: string;
}

export default function TickerMultiSelect({
  availableTickers,
  selectedTickers,
  onTickerChange,
  className = ''
}: TickerMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTickerToggle = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      onTickerChange(selectedTickers.filter(t => t !== ticker));
    } else {
      onTickerChange([...selectedTickers, ticker]);
    }
  };

  const handleSelectAll = () => {
    onTickerChange(availableTickers);
  };

  const handleClearAll = () => {
    onTickerChange([]);
  };

  // Sort available tickers alphabetically
  const sortedTickers = [...availableTickers].sort((a, b) => a.localeCompare(b));

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-w-[160px]"
      >
        <div className="flex items-center space-x-2">
          <span>Ticker Filter</span>
          {selectedTickers.length > 0 && selectedTickers.length < availableTickers.length && (
            <Badge variant="secondary" className="ml-2">
              {selectedTickers.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 w-64 mt-1 z-50 shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
          <CardContent className="p-2 bg-white dark:bg-gray-900">
            {/* Header with Select All / Clear All */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 pt-1 px-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-6 px-2 text-foreground font-medium"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-6 px-2 text-foreground font-medium"
              >
                Clear All
              </Button>
            </div>

            {/* Ticker Options */}
            <div className="space-y-1">
              {sortedTickers.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground text-center">No tickers available</div>
              ) : (
                sortedTickers.map((ticker) => {
                  const isSelected = selectedTickers.includes(ticker);
                  return (
                    <label
                      key={ticker}
                      className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTickerToggle(ticker)}
                        className="rounded border-input h-4 w-4 text-primary focus:ring-ring shrink-0"
                      />
                      <span className="text-sm font-medium flex-1">{ticker}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Selected Tickers Display */}
            {selectedTickers.length > 0 && selectedTickers.length <= 10 && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-muted-foreground mb-2">Selected:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedTickers.map((ticker, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {ticker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedTickers.length > 10 && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-muted-foreground">
                  {selectedTickers.length} tickers selected
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
