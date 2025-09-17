'use client';

import { Portfolio } from '@/types/options';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, StarOff } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';

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

  const handleDeletePortfolio = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedPortfolioId) return;

    const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
    if (!portfolio) return;

    if (portfolio.isDefault) {
      alert('Cannot delete the default portfolio');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the portfolio "${portfolio.name}"? This action cannot be undone.`
    );

    if (confirmed) {
      onDeletePortfolio(selectedPortfolioId);
    }
  };

  const canDeleteSelectedPortfolio = () => {
    if (!selectedPortfolioId) return false;
    const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
    return portfolio && !portfolio.isDefault;
  };

  const handleSetDefaultPortfolio = async (portfolioId: string) => {
    try {
      await onSetDefaultPortfolio(portfolioId);
    } catch (error) {
      console.error('Failed to set default portfolio:', error);
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
          <Button variant="default" onClick={onAddPortfolio}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Additional portfolio actions in second row if needed */}
        {(selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault) || canDeleteSelectedPortfolio() ? (
          <div className="flex space-x-2">
            {selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault && (
              <Button
                variant="outline"
                onClick={() => handleSetDefaultPortfolio(selectedPortfolioId)}
                title="Set as default portfolio"
                className="flex-1"
              >
                <Star className="mr-2 h-4 w-4" />
                Set Default
              </Button>
            )}

            {canDeleteSelectedPortfolio() && (
              <Button
                variant="destructive"
                onClick={handleDeletePortfolio}
                title="Delete selected portfolio"
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Desktop: Horizontal layout
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Select value={selectedPortfolioId || 'all'} onValueChange={handlePortfolioChange}>
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
        <Button variant="default" onClick={onAddPortfolio}>
          <Plus className="mr-2 h-4 w-4" />
          Add Portfolio
        </Button>

        {selectedPortfolioId && !portfolios.find(p => p.id === selectedPortfolioId)?.isDefault && (
          <Button
            variant="outline"
            onClick={() => handleSetDefaultPortfolio(selectedPortfolioId)}
            title="Set as default portfolio"
          >
            <Star className="mr-2 h-4 w-4" />
            Set Default
          </Button>
        )}

        {canDeleteSelectedPortfolio() && (
          <Button
            variant="destructive"
            onClick={handleDeletePortfolio}
            title="Delete selected portfolio"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
