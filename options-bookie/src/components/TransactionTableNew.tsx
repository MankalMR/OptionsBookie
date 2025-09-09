'use client';

import { OptionsTransaction, Portfolio } from '@/types/options';
import { useState } from 'react';
import { calculateProfitLoss } from '@/utils/optionsCalculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionTableProps {
  transactions: OptionsTransaction[];
  onUpdate: (id: string, updates: Partial<OptionsTransaction>) => void;
  onDelete: (id: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  portfolios?: Portfolio[];
  showPortfolioColumn?: boolean;
}

export default function TransactionTable({ transactions, onUpdate, onDelete, onEdit, portfolios = [], showPortfolioColumn = false }: TransactionTableProps) {
  const [sortBy, setSortBy] = useState<keyof OptionsTransaction>('tradeOpenDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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
                ${transaction.strikePrice.toFixed(2)}
              </TableCell>
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
                  {transaction.profitLoss >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-medium ${transaction.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.profitLoss >= 0 ? '+' : ''}${transaction.profitLoss.toFixed(2)}
                  </span>
                </div>
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
