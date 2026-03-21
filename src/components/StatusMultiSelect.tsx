'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronDown, X } from 'lucide-react';

interface StatusMultiSelectProps {
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'Rolled', label: 'Rolled', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'Expired', label: 'Expired', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'Assigned', label: 'Assigned', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
];

export default function StatusMultiSelect({
  selectedStatuses,
  onStatusChange,
  className = ''
}: StatusMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusToggle = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleSelectAll = () => {
    onStatusChange(STATUS_OPTIONS.map(option => option.value));
  };

  const handleClearAll = () => {
    onStatusChange([]);
  };

  const getSelectedLabels = () => {
    return selectedStatuses.map(status =>
      STATUS_OPTIONS.find(option => option.value === status)?.label || status
    );
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-w-[200px]"
      >
        <div className="flex items-center space-x-2">
          <span>Status Filter</span>
          {selectedStatuses.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedStatuses.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-2 bg-white dark:bg-gray-900">
            {/* Header with Select All / Clear All */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-6 px-2"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-6 px-2"
              >
                Clear All
              </Button>
            </div>

            {/* Status Options */}
            <div className="space-y-1">
              {STATUS_OPTIONS.map((option) => {
                const isSelected = selectedStatuses.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleStatusToggle(option.value)}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                      {option.label}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </label>
                );
              })}
            </div>

            {/* Selected Statuses Display */}
            {selectedStatuses.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-muted-foreground mb-2">Selected:</div>
                <div className="flex flex-wrap gap-1">
                  {getSelectedLabels().map((label, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  ))}
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
