'use client';

import { OptionsTransaction, Portfolio } from '@/types/options';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';
import StockPriceDisplay, { ITMIndicator } from '@/components/StockPriceDisplay';

interface TransactionTableProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  portfolios?: Portfolio[];
  showPortfolioColumn?: boolean;
}

export default function TransactionTable({ transactions, onDelete, onEdit, portfolios = [], showPortfolioColumn = false }: TransactionTableProps) {
  const [sortBy, setSortBy] = useState<keyof OptionsTransaction>('tradeOpenDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique stock symbols for price fetching
  const stockSymbols = [...new Set(transactions.map(t => t.stockSymbol))];
  const { stockPrices, loading: pricesLoading, isAvailable: pricesAvailable, error: pricesError, refreshPrices } = useStockPrices(stockSymbols);

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const handleSort = (column: keyof OptionsTransaction) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', date);
      return 'Invalid Date';
    }
  };

  const getPortfolioName = (portfolioId: string) => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio ? portfolio.name : 'Unknown Portfolio';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Closed':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground">
          <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No trades yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first options trade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Recent Trades</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshPrices}
          disabled={pricesLoading}
          className="flex items-center space-x-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span>{pricesLoading ? 'Refreshing...' : 'Refresh Prices'}</span>
        </Button>
      </div>

      {/* Stock price availability notification */}
      {!pricesAvailable && pricesError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {pricesError}
              </p>
            </div>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('stockSymbol')}
            >
              Symbol
            </TableHead>
            {showPortfolioColumn && (
              <TableHead>Portfolio</TableHead>
            )}
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('tradeOpenDate')}
            >
              Open Date
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('callOrPut')}
            >
              Type
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('strikePrice')}
            >
              Strike
            </TableHead>
            {pricesAvailable && (
              <TableHead>
                Current Price
              </TableHead>
            )}
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('premium')}
            >
              Premium
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('numberOfContracts')}
            >
              Contracts
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('status')}
            >
              Status
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('profitLoss')}
            >
              P&L
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('daysToExpiry')}
            >
              DTE
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('daysHeld')}
            >
              Days Held
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                {transaction.stockSymbol}
              </TableCell>
              {showPortfolioColumn && (
                <TableCell>
                  {getPortfolioName(transaction.portfolioId)}
                </TableCell>
              )}
              <TableCell>
                {formatDate(transaction.tradeOpenDate)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={transaction.callOrPut === 'Call' ? 'default' : 'secondary'}
                  className={transaction.callOrPut === 'Call'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }
                >
                  {transaction.callOrPut}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span>${transaction.strikePrice.toFixed(2)}</span>
                  {stockPrices[transaction.stockSymbol] && transaction.status === 'Open' && (
                    <ITMIndicator
                      currentPrice={stockPrices[transaction.stockSymbol]!.price}
                      strikePrice={transaction.strikePrice}
                      optionType={transaction.callOrPut}
                    />
                  )}
                </div>
              </TableCell>
              {pricesAvailable && (
                <TableCell>
                  <StockPriceDisplay
                    symbol={transaction.stockSymbol}
                    stockPrice={stockPrices[transaction.stockSymbol] || null}
                    strikePrice={transaction.strikePrice}
                    loading={pricesLoading}
                    showComparison={false}
                  />
                </TableCell>
              )}
              <TableCell>
                ${transaction.premium.toFixed(2)}
              </TableCell>
              <TableCell>
                {transaction.numberOfContracts}
              </TableCell>
              <TableCell>
                <Badge
                  variant={transaction.status === 'Open' ? 'default' : 'secondary'}
                  className={getStatusColor(transaction.status)}
                >
                  {transaction.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  {(transaction.profitLoss ?? 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-medium ${(transaction.profitLoss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(transaction.profitLoss ?? 0) >= 0 ? '+' : ''}${(transaction.profitLoss ?? 0).toFixed(2)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className={`font-medium ${
                  transaction.daysToExpiry <= 7
                    ? 'text-red-600 bg-red-50 px-2 py-1 rounded'
                    : transaction.daysToExpiry <= 30
                    ? 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
                    : 'text-gray-600'
                }`}>
                  {transaction.daysToExpiry}
                </span>
              </TableCell>
              <TableCell>
                {transaction.daysHeld}
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(transaction.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
