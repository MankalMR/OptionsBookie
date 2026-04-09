'use client';

import { Portfolio } from '@/types/options';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Loader2, Check, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { logger } from "@/lib/logger";
import { useState, useEffect } from 'react';

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  onPortfolioChange: (portfolioId: string | null) => void;
  onAddPortfolio: () => void;
  onDeletePortfolio: (portfolioId: string) => void;
  onSetDefaultPortfolio: (portfolioId: string) => void;
  loading?: boolean;
}

export default function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  onPortfolioChange,
  onAddPortfolio,
  onDeletePortfolio,
  onSetDefaultPortfolio,
  loading = false,
}: PortfolioSelectorProps) {
  const isMobile = useIsMobile();

  const handlePortfolioChange = (value: string) => {
    const portfolioId = value === 'all' ? null : value;
    onPortfolioChange(portfolioId);
  };

  const [actionStatus, setActionStatus] = useState<'idle' | 'confirming-delete' | 'deleting' | 'setting-default' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset status after a delay
  useEffect(() => {
    if (actionStatus === 'success' || actionStatus === 'error') {
      const timer = setTimeout(() => {
        setActionStatus('idle');
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  const handleDeletePortfolio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedPortfolioId) return;

    const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
    if (!portfolio) return;

    if (portfolio.isDefault) {
      setErrorMessage('Cannot delete the default portfolio');
      setActionStatus('error');
      return;
    }

    if (actionStatus !== 'confirming-delete') {
      setActionStatus('confirming-delete');
      return;
    }

    try {
      setActionStatus('deleting');
      await onDeletePortfolio(selectedPortfolioId);
      setActionStatus('success');
    } catch (error) {
      logger.error({ error }, 'Failed to delete portfolio:');
      setErrorMessage(error instanceof Error ? error.message : 'Delete failed');
      setActionStatus('error');
    }
  };

  const handleSetDefaultPortfolio = async (portfolioId: string) => {
    try {
      setActionStatus('setting-default');
      await onSetDefaultPortfolio(portfolioId);
      setActionStatus('success');
    } catch (error) {
      logger.error({ error }, 'Failed to set default portfolio:');
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
      setActionStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        <span className="text-sm text-gray-600">Loading portfolios...</span>
      </div>
    );
  }

  if (isMobile) {
    // Mobile: Full-width stacked layout
    return (
      <div className="space-y-3">
        <div className="flex space-x-2">
          <Select value={selectedPortfolioId || 'all'} onValueChange={handlePortfolioChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} {portfolio.isDefault ? '⭐' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="default" onClick={onAddPortfolio} aria-label="Add new portfolio">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault) ? (
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <Button
                variant={actionStatus === 'success' ? 'default' : 'outline'}
                onClick={() => handleSetDefaultPortfolio(selectedPortfolioId)}
                disabled={actionStatus !== 'idle'}
                className={`flex-1 ${actionStatus === 'success' ? 'border-emerald-500 text-emerald-600' : ''}`}
                title="Set as default portfolio"
              >
                {actionStatus === 'setting-default' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : actionStatus === 'success' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Star className="mr-2 h-4 w-4" />
                )}
                {actionStatus === 'success' ? 'Success!' : 'Set Default'}
              </Button>

              <Button
                variant="destructive"
                onClick={handleDeletePortfolio}
                disabled={actionStatus === 'deleting' || actionStatus === 'setting-default'}
                className={`flex-1 ${actionStatus === 'confirming-delete' ? 'ring-2 ring-destructive ring-offset-2 animate-pulse' : ''}`}
                title="Delete selected portfolio"
              >
                {actionStatus === 'deleting' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : actionStatus === 'confirming-delete' ? (
                  <AlertCircle className="mr-2 h-4 w-4" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {actionStatus === 'confirming-delete' ? 'Confirm?' : 'Delete'}
              </Button>
            </div>
            
            {errorMessage && (
              <div className="text-[10px] text-destructive flex items-center gap-1 justify-center animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-3 w-3" />
                {errorMessage}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Desktop: Horizontal layout
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Select 
            value={selectedPortfolioId || 'all'} 
            onValueChange={handlePortfolioChange}
            disabled={actionStatus !== 'idle' && actionStatus !== 'confirming-delete'}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} {portfolio.isDefault ? '⭐' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="default" onClick={onAddPortfolio} disabled={actionStatus !== 'idle'}>
            <Plus className="mr-2 h-4 w-4" />
            Add Portfolio
          </Button>

          {selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault && (
            <Button
              variant={actionStatus === 'success' ? 'default' : 'outline'}
              onClick={() => handleSetDefaultPortfolio(selectedPortfolioId)}
              disabled={actionStatus !== 'idle' && actionStatus !== 'confirming-delete'}
              className={actionStatus === 'success' ? 'border-emerald-500 text-emerald-600' : ''}
              title="Set as default portfolio"
            >
              {actionStatus === 'setting-default' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : actionStatus === 'success' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Star className="mr-2 h-4 w-4" />
              )}
              Set Default
            </Button>
          )}

          {selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault && (
            <Button
              variant="destructive"
              onClick={handleDeletePortfolio}
              disabled={actionStatus === 'deleting' || actionStatus === 'setting-default'}
              className={actionStatus === 'confirming-delete' ? 'ring-2 ring-destructive ring-offset-2 animate-pulse' : ''}
              title="Delete selected portfolio"
            >
              {actionStatus === 'deleting' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : actionStatus === 'confirming-delete' ? (
                <AlertCircle className="mr-2 h-4 w-4" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {actionStatus === 'confirming-delete' ? 'Confirm Delete?' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
      
      {errorMessage && (
        <div className="text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
