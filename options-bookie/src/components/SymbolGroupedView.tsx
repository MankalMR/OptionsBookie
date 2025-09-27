'use client';

import { useState, useMemo, useEffect } from 'react';
import { OptionsTransaction } from '@/types/options';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TransactionTable from './TransactionTable';
import Tooltip from './ui/tooltip';

interface SymbolGroupedViewProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onDeleteChain: (chainId: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  chains: any[];
  portfolios: any[];
  showPortfolioColumn: boolean;
}

interface SymbolGroup {
  symbol: string;
  trades: OptionsTransaction[];
}

export default function SymbolGroupedView({
  transactions,
  onDelete,
  onDeleteChain,
  onEdit,
  chains,
  portfolios,
  showPortfolioColumn
}: SymbolGroupedViewProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);

  // Expand all symbols by default when transactions change
  useEffect(() => {
    const symbols = new Set(transactions.map(t => t.stockSymbol));
    setExpandedSymbols(symbols);
    setAllExpanded(true);
  }, [transactions]);

  // Group transactions by symbol while maintaining date order
  const groupedTransactions = useMemo(() => {
    const groups = transactions.reduce((acc, transaction) => {
      const symbol = transaction.stockSymbol;
      if (!acc[symbol]) {
        acc[symbol] = [];
      }
      acc[symbol].push(transaction);
      return acc;
    }, {} as Record<string, OptionsTransaction[]>);

    // Sort each group by opened date (maintains existing sorting)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => new Date(a.tradeOpenDate).getTime() - new Date(b.tradeOpenDate).getTime());
    });

    // Convert to array and sort by most recent trade date
    return Object.entries(groups)
      .map(([symbol, trades]) => ({ symbol, trades }))
      .sort((a, b) => {
        const aLatest = Math.max(...a.trades.map(t => new Date(t.tradeOpenDate).getTime()));
        const bLatest = Math.max(...b.trades.map(t => new Date(t.tradeOpenDate).getTime()));
        return bLatest - aLatest;
      });
  }, [transactions]);

  const toggleSymbol = (symbol: string) => {
    setExpandedSymbols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedSymbols(new Set());
      setAllExpanded(false);
    } else {
      const symbols = new Set(groupedTransactions.map(group => group.symbol));
      setExpandedSymbols(symbols);
      setAllExpanded(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Trades by Symbol</h3>
              <Tooltip content="Expand or collapse all symbol groups">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  className="text-xs"
                >
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </Button>
              </Tooltip>
            </div>

      {/* Symbol Groups */}
      <div className="space-y-2">
        {groupedTransactions.map(({ symbol, trades }) => {
          const isExpanded = expandedSymbols.has(symbol);
          const openTrades = trades.filter(t => t.status === 'Open').length;
          const closedTrades = trades.filter(t => t.status !== 'Open').length;
          const lastTradeDate = trades[trades.length - 1]?.tradeOpenDate;

          return (
            <div key={symbol} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              {/* Symbol Header - aligned with table content */}
              <div
                className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700"
                onClick={() => toggleSymbol(symbol)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" title={`Stock symbol: ${symbol}`}>📈</span>
                    <div>
                      <h4 className="font-semibold text-lg">{symbol}</h4>
                      <p className="text-sm text-muted-foreground">
                        {trades.length} trade{trades.length !== 1 ? 's' : ''} •
                        Open: {openTrades} • Closed: {closedTrades}
                        {lastTradeDate && ` • Last: ${new Date(lastTradeDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    title={isExpanded ? 'Collapse trades' : 'Expand trades'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Table Content - no extra padding, aligned with header */}
              {isExpanded && (
                <div className="bg-white dark:bg-gray-900">
                    <TransactionTable
                      transactions={trades}
                      onDelete={onDelete}
                      onDeleteChain={onDeleteChain}
                      onEdit={onEdit}
                      chains={chains}
                      portfolios={portfolios}
                      showPortfolioColumn={showPortfolioColumn}
                      showHeader={true}
                      compact={true}
                    />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
