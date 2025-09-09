'use client';

import { Portfolio } from '@/types/options';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Star, StarOff } from 'lucide-react';

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

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const portfolioId = e.target.value || null;
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

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="portfolio-select" className="text-sm font-medium text-gray-700">
          Portfolio:
        </label>
        <select
          id="portfolio-select"
          value={selectedPortfolioId || ''}
          onChange={handlePortfolioChange}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
        >
          <option value="">All Portfolios</option>
          {portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name} {portfolio.isDefault ? '⭐' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Button onClick={onAddPortfolio}>
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
