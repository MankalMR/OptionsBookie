'use client';

import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Link } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';
import StockPriceDisplay, { ITMIndicator } from '@/components/StockPriceDisplay';

interface TransactionTableProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  portfolios?: Portfolio[];
  showPortfolioColumn?: boolean;
  chains?: TradeChain[];
}

export default function TransactionTable({ transactions, onDelete, onEdit, portfolios = [], showPortfolioColumn = false, chains = [] }: TransactionTableProps) {
  const [sortBy, setSortBy] = useState<keyof OptionsTransaction>('tradeOpenDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collapsedChains, setCollapsedChains] = useState<Set<string>>(new Set());

  // Debug logging removed - chain indicators working correctly

  // Helper function to toggle chain collapse state
  const toggleChainCollapse = (chainId: string) => {
    const newCollapsed = new Set(collapsedChains);
    if (newCollapsed.has(chainId)) {
      newCollapsed.delete(chainId);
    } else {
      newCollapsed.add(chainId);
    }
    setCollapsedChains(newCollapsed);
  };

  // Helper function to calculate chain P&L
  const calculateChainPnL = (chainId: string) => {
    return transactions
      .filter(t => t.chainId === chainId)
      .reduce((total, t) => total + (t.profitLoss || 0), 0);
  };

  // Organize transactions into chains and standalone transactions
  const organizeTransactions = () => {
    const chainMap = new Map<string, OptionsTransaction[]>();
    const standaloneTransactions: OptionsTransaction[] = [];

    // Group transactions by chainId
    transactions.forEach(transaction => {
      if (transaction.chainId) {
        if (!chainMap.has(transaction.chainId)) {
          chainMap.set(transaction.chainId, []);
        }
        chainMap.get(transaction.chainId)!.push(transaction);
      } else {
        standaloneTransactions.push(transaction);
      }
    });

    // Sort transactions within each chain by date (most recent first)
    chainMap.forEach(chainTransactions => {
      chainTransactions.sort((a, b) =>
        new Date(b.tradeOpenDate).getTime() - new Date(a.tradeOpenDate).getTime()
      );
    });

    return { chainMap, standaloneTransactions };
  };

  // Get unique stock symbols for price fetching
  const stockSymbols = [...new Set(transactions.map(t => t.stockSymbol))];
  const { stockPrices, loading: pricesLoading, isAvailable: pricesAvailable, error: pricesError, refreshPrices } = useStockPrices(stockSymbols);

  // Note: Sorting is now handled within the organize function for chains

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
        return <span>Invalid Date</span>;
      }

      const monthDay = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(dateObj);

      const year = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
      }).format(dateObj);

      return (
        <div className="flex flex-col">
          <span>{monthDay}</span>
          <span className="text-xs text-gray-500">{year}</span>
        </div>
      );
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', date);
      return <span>Invalid Date</span>;
    }
  };

  const getPortfolioName = (portfolioId: string) => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio ? portfolio.name : 'Unknown Portfolio';
  };

  // Calculate Days to Expiry dynamically
  const calculateDTE = (expiryDate: string | Date) => {
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      
      // Set time to start of day for accurate day calculation
      expiry.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error('Error calculating DTE:', error);
      return 0;
    }
  };

  // Calculate Days Held dynamically
  const calculateDH = (openDate: string | Date) => {
    try {
      const opened = new Date(openDate);
      const today = new Date();
      
      // Set time to start of day for accurate day calculation
      opened.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - opened.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(0, diffDays); // Don't show negative days
    } catch (error) {
      console.error('Error calculating DH:', error);
      return 0;
    }
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
              Opened
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('expiryDate')}
            >
              Expires
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
              title="Days to Expiry"
            >
              DTE
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('daysHeld')}
              title="Days Held"
            >
              DH
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(() => {
            const { chainMap, standaloneTransactions } = organizeTransactions();
            const renderElements: JSX.Element[] = [];

            // Render chains first
            Array.from(chainMap.entries()).forEach(([chainId, chainTransactions]) => {
              const isCollapsed = collapsedChains.has(chainId);
              const chainPnL = calculateChainPnL(chainId);
              const chainInfo = chains.find(c => c.id === chainId);
              const activeTransaction = chainTransactions.find(t => t.status === 'Open') || chainTransactions[chainTransactions.length - 1];

              // Chain header row
              renderElements.push(
                <TableRow key={`chain-${chainId}`} className="bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500">
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleChainCollapse(chainId)}
                        className="h-6 w-6 p-0"
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Link className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{activeTransaction.stockSymbol} Chain</span>
                          <Badge
                            variant={activeTransaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                            className={`text-xs ${activeTransaction.buyOrSell === 'Buy'
                              ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                              : 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                            }`}
                          >
                            {activeTransaction.buyOrSell}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 border-blue-300">
                            {chainTransactions.length} trades
                          </Badge>
                          <Badge variant={chainInfo?.chainStatus === 'Active' ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                            {chainInfo?.chainStatus || 'Active'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {showPortfolioColumn && <TableCell></TableCell>}
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  {pricesAvailable && <TableCell></TableCell>}
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className={`font-bold ${chainPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${chainPnL.toFixed(2)}
                    <div className="text-xs text-gray-500 font-normal">Chain P&L</div>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              );

              // Individual transactions in the chain (if not collapsed)
              if (!isCollapsed) {
                chainTransactions.forEach((transaction, index) => {
                  const isLast = index === chainTransactions.length - 1;
                  renderElements.push(
                    <TableRow
                      key={transaction.id}
                      className={`hover:bg-muted/50 bg-blue-25 border-l-4 border-l-blue-200 ${
                        ['Closed', 'Expired', 'Assigned'].includes(transaction.status)
                          ? 'bg-gray-200/80'
                          : transaction.status === 'Rolled'
                          ? 'bg-amber-50/70'
                          : ''
                      }`}
                    >
                      <TableCell className="font-medium pl-8">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">└─</span>
                          <span>{transaction.stockSymbol}</span>
                          <span
                            className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                            title="Number of Contracts"
                          >
                            {transaction.numberOfContracts}
                          </span>
                          {stockPrices[transaction.stockSymbol] && transaction.status === 'Open' && (
                            <ITMIndicator
                              currentPrice={stockPrices[transaction.stockSymbol]!.price}
                              strikePrice={transaction.strikePrice}
                              optionType={transaction.callOrPut}
                            />
                          )}
                          {isLast && transaction.status === 'Open' && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">
                              Current
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {showPortfolioColumn && (
                        <TableCell>
                          {portfolios.find(p => p.id === transaction.portfolioId)?.name || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell>
                        {formatDate(transaction.tradeOpenDate)}
                      </TableCell>
                      <TableCell>
                        {formatDate(transaction.expiryDate)}
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
                        <span>${transaction.strikePrice.toFixed(2)}</span>
                      </TableCell>
                      {pricesAvailable && (
                        <TableCell>
                          {stockPrices[transaction.stockSymbol] ? (
                            <StockPriceDisplay
                              symbol={transaction.stockSymbol}
                              stockPrice={stockPrices[transaction.stockSymbol]!}
                              strikePrice={transaction.strikePrice}
                              showComparison={false}
                            />
                          ) : (
                            <span className="text-gray-400">Loading...</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>${transaction.premium.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === 'Open' ? 'default' :
                            transaction.status === 'Closed' ? 'secondary' :
                            transaction.status === 'Rolled' ? 'outline' :
                            'destructive'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.profitLoss && transaction.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <div className="flex items-center">
                          {transaction.profitLoss !== undefined && transaction.profitLoss !== 0 && (
                            <>
                              {transaction.profitLoss > 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              )}
                            </>
                          )}
                          ${transaction.profitLoss?.toFixed(2) || '0.00'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          calculateDTE(transaction.expiryDate) <= 7
                            ? 'text-red-600 bg-red-50 px-2 py-1 rounded'
                            : calculateDTE(transaction.expiryDate) <= 30
                            ? 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
                            : 'text-gray-600'
                        }`}>
                          {calculateDTE(transaction.expiryDate)}
                        </span>
                      </TableCell>
                      <TableCell>{calculateDH(transaction.tradeOpenDate)}</TableCell>
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
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                });
              }
            });

            // Render standalone transactions (no chains)
            standaloneTransactions.forEach((transaction) => {
              renderElements.push(
                <TableRow
                  key={transaction.id}
                  className={`hover:bg-muted/50 ${
                    ['Closed', 'Expired', 'Assigned'].includes(transaction.status)
                      ? 'bg-gray-200/80'
                      : transaction.status === 'Rolled'
                      ? 'bg-amber-50/70'
                      : ''
                  }`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <span>{transaction.stockSymbol}</span>
                  <span
                    className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                    title="Number of Contracts"
                  >
                    {transaction.numberOfContracts}
                  </span>
                  {stockPrices[transaction.stockSymbol] && transaction.status === 'Open' && (
                    <ITMIndicator
                      currentPrice={stockPrices[transaction.stockSymbol]!.price}
                      strikePrice={transaction.strikePrice}
                      optionType={transaction.callOrPut}
                    />
                  )}
                  <Badge
                    variant={transaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                    className={`text-xs ${transaction.buyOrSell === 'Buy'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                      : 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                    }`}
                  >
                    {transaction.buyOrSell}
                  </Badge>
                  {transaction.chainId && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                      🔗
                    </Badge>
                  )}
                </div>
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
                {formatDate(transaction.expiryDate)}
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
                <span>${transaction.strikePrice.toFixed(2)}</span>
              </TableCell>
              {pricesAvailable && (
                <TableCell>
                  {stockPrices[transaction.stockSymbol] ? (
                    <StockPriceDisplay
                      symbol={transaction.stockSymbol}
                      stockPrice={stockPrices[transaction.stockSymbol]!}
                      strikePrice={transaction.strikePrice}
                      showComparison={false}
                    />
                  ) : (
                    <span className="text-gray-400">Loading...</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                ${transaction.premium.toFixed(2)}
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
                  calculateDTE(transaction.expiryDate) <= 7
                    ? 'text-red-600 bg-red-50 px-2 py-1 rounded'
                    : calculateDTE(transaction.expiryDate) <= 30
                    ? 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
                    : 'text-gray-600'
                }`}>
                  {calculateDTE(transaction.expiryDate)}
                </span>
              </TableCell>
              <TableCell>
                {calculateDH(transaction.tradeOpenDate)}
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
              );
            });

            return renderElements;
          })()}
        </TableBody>
      </Table>
    </div>
  );
}
