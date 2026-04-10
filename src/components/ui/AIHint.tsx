import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIHintProps {
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

/**
 * A consistent UI hint to denote AI-powered features.
 * Standardizes the "Signature" look (Sparkles icon + themed text).
 */
export default function AIHint({ children, className = '', iconClassName = '' }: AIHintProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="p-1 rounded-md bg-sky-100 dark:bg-sky-900/30">
        <Sparkles className={`h-4 w-4 text-sky-500 dark:text-sky-400 ${iconClassName}`} />
      </div>
      <div className="font-medium text-card-foreground">
        {children}
      </div>
    </div>
  );
}
