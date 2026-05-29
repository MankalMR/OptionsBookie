'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'grouped' | 'flat';
  onViewChange: (mode: 'grouped' | 'flat') => void;
  className?: string;
}

export default function ViewToggle({ viewMode, onViewChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex border rounded-md">
        <Button
          variant={viewMode === 'grouped' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('grouped')}
          className="rounded-r-none border-r"
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Grouped
        </Button>
        <Button
          variant={viewMode === 'flat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('flat')}
          className="rounded-l-none"
        >
          <List className="h-4 w-4 mr-2" />
          Flat
        </Button>
      </div>
    </div>
  );
}
