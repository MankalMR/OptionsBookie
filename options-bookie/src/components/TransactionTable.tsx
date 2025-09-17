'use client';

import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Link, Circle, FileText, Minus, User, Diamond } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';
import StockPriceDisplay, { ITMIndicator } from '@/components/StockPriceDisplay';
import { calculateDTE, calculateDH, formatPnLNumber, calculateChainPnL } from '@/utils/optionsCalculations';

interface TransactionTableProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onDeleteChain?: (chainId: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  portfolios?: Portfolio[];
  showPortfolioColumn?: boolean;
  chains?: TradeChain[];
}

export default function TransactionTable({ transactions, onDelete, onDeleteChain, onEdit, portfolios = [], showPortfolioColumn = false, chains = [] }: TransactionTableProps) {
  const [sortBy, setSortBy] = useState<keyof OptionsTransaction>('tradeOpenDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collapsedChains, setCollapsedChains] = useState<Set<string>>(new Set());

  // Initialize collapsed state for closed chains
  useEffect(() => {
    const closedChainIds = new Set<string>();

    // Debug: Log all chains with their statuses (removed in production)

    // Find chains that are closed/completed and should be collapsed by default
    chains.forEach(chain => {
      if (chain.chainStatus === 'Closed') {
        closedChainIds.add(chain.id);
      }
    });

    // Closed chain IDs to collapse: removed debug logging

    // Only update if there are changes to avoid unnecessary re-renders
    if (closedChainIds.size > 0) {
      setCollapsedChains(prev => {
        const newCollapsed = new Set(prev);
        closedChainIds.forEach(id => newCollapsed.add(id));
        return newCollapsed;
      });
    }
  }, [chains]);

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

  // Use centralized chain P&L calculation
  const getChainPnL = (chainId: string) => calculateChainPnL(chainId, transactions);

  // Helper function to get chain styling based on status
  const getChainStyling = (chainId: string, chainTransactions: OptionsTransaction[]) => {
    const chainInfo = chains.find(c => c.id === chainId);
    const hasOpenTransactions = chainTransactions.some(t => t.status === 'Open');
    const isActiveChain = chainInfo?.chainStatus === 'Active';
    const isClosedChain = chainInfo?.chainStatus === 'Closed';

    // If chain is closed, use muted styling to de-emphasize
    if (isClosedChain) {
      return "bg-muted/70 dark:bg-muted/70 hover:bg-muted/80 dark:hover:bg-muted/80 border-l-4 border-l-muted-foreground";
    }

    // If chain is active and has open transactions, use blue styling to show activity
    if (isActiveChain && hasOpenTransactions) {
      return "bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-950/50 border-l-4 border-l-blue-500";
    }

    // Default active chain styling
    return "bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/50 dark:hover:bg-blue-950/40 border-l-4 border-l-blue-500";
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
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else {
        // For string dates (YYYY-MM-DD format), parse as local date to avoid timezone shifts
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-').map(Number);
          dateObj = new Date(year, month - 1, day); // month is 0-indexed
        } else {
          dateObj = new Date(date);
        }
      }

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
          <span className="text-xs text-muted-foreground">{year}</span>
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


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50';
      case 'Closed':
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
      case 'Rolled':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50';
      case 'Expired':
        return 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-950/50';
      case 'Assigned':
        return 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-950/50';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
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
              <div className="flex items-center space-x-1">
                <div className="h-5 w-5 flex-shrink-0"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 flex-shrink-0"></div>
                  <span>Symbol</span>
                </div>
              </div>
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
              title="Days to Expiry for open trades, Close date for finished trades"
            >
              DTE/Closed
            </TableHead>
            <TableHead
              title="Days Held"
            >
              DH
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
              const chainPnL = getChainPnL(chainId);
              const chainInfo = chains.find(c => c.id === chainId);
              const activeTransaction = chainTransactions.find(t => t.status === 'Open') || chainTransactions[chainTransactions.length - 1];

              // Chain header row
              renderElements.push(
                <TableRow key={`chain-${chainId}`} className={getChainStyling(chainId, chainTransactions)}>
                  <TableCell className="font-medium">
                    <div className="flex items-start space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleChainCollapse(chainId)}
                        className="h-5 w-5 p-0 mt-0.5 flex-shrink-0"
                      >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Link className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="font-semibold text-sm">{activeTransaction.stockSymbol} Chain</span>
                          <span
                            className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded flex-shrink-0"
                            title="Number of Trades"
                          >
                            {chainTransactions.length} trades
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1 ml-5">
                          <Badge
                            variant={activeTransaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                            className={`text-xs ${activeTransaction.buyOrSell === 'Buy'
                              ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                              : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50'
                            }`}
                          >
                            {activeTransaction.buyOrSell}
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
                  <TableCell></TableCell>
                  {pricesAvailable && <TableCell></TableCell>}
                  <TableCell></TableCell>
                  <TableCell>
                    <Badge
                      variant={chainInfo?.chainStatus === 'Active' ? 'default' : 'secondary'}
                      className={`text-xs px-1.5 py-0.5 ${
                        chainInfo?.chainStatus === 'Active'
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {chainInfo?.chainStatus || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`font-bold ${chainPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPnLNumber(chainPnL)}
                    <div className="text-xs text-muted-foreground font-normal">Chain P&L</div>
                  </TableCell>
                  <TableCell>
                    {onDeleteChain && (
                      <div className="flex space-x-1">
                        <div
                          className="h-8 w-8 flex items-center justify-center text-muted-foreground"
                          title="Chain deletion"
                        >
                          <Link className="h-4 w-4" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteChain(chainId)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete entire chain"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );

              // Individual transactions in the chain (if not collapsed)
              if (!isCollapsed) {
                chainTransactions.forEach((transaction, index) => {
                  const isLast = index === chainTransactions.length - 1;
                  renderElements.push(
                    <TableRow
                      key={transaction.id}
                      className={`hover:bg-accent/50 border-l-4 border-l-blue-200 dark:border-l-blue-700 ${
                        transaction.status === 'Open'
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-blue-500'
                          : transaction.status === 'Rolled'
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-l-amber-500'
                          : ['Closed', 'Expired', 'Assigned'].includes(transaction.status)
                          ? 'bg-muted/60 dark:bg-muted/60 border-l-muted-foreground'
                          : ''
                      }`}
                    >
                      <TableCell className="font-medium pl-8">
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">└─</span>
                          <span>{transaction.stockSymbol}</span>
                          <span
                            className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
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
                        {transaction.status === 'Open' ? (
                          <span className={`font-medium ${
                            calculateDTE(transaction.expiryDate) <= 7
                              ? 'text-red-600 bg-red-50 px-2 py-1 rounded'
                              : calculateDTE(transaction.expiryDate) <= 30
                              ? 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
                              : 'text-muted-foreground'
                          }`}>
                            {calculateDTE(transaction.expiryDate)}
                          </span>
                        ) : (
                          <div className="text-muted-foreground text-sm">
                            {transaction.status === 'Expired'
                              ? formatDate(transaction.expiryDate)
                              : transaction.closeDate
                                ? formatDate(transaction.closeDate)
                                : <span className="text-muted-foreground">-</span>
                            }
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{calculateDH(transaction.tradeOpenDate, transaction.closeDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>${transaction.strikePrice.toFixed(2)}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                          </span>
                        </div>
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
                            <span className="text-muted-foreground">Loading...</span>
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
                          className={getStatusColor(transaction.status)}
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
                          {formatPnLNumber(transaction.profitLoss || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {/* Hide edit button for rolled transactions to prevent data integrity issues */}
                          {transaction.status !== 'Rolled' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div
                              className="h-8 w-8 flex items-center justify-center text-muted-foreground cursor-not-allowed"
                              title="Cannot edit rolled transactions. Delete entire chain to make changes."
                            >
                              <Edit className="h-4 w-4" />
                            </div>
                          )}
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
              }
            });

            // Render standalone transactions (no chains)
            standaloneTransactions.forEach((transaction) => {
              renderElements.push(
                <TableRow
                  key={transaction.id}
                  className={`hover:bg-accent/50 ${
                    transaction.status === 'Open'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40'
                      : transaction.status === 'Rolled'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40'
                      : ['Closed', 'Expired', 'Assigned'].includes(transaction.status)
                      ? 'bg-muted/60 dark:bg-muted/60'
                      : ''
                  }`}
            >
              <TableCell className="font-medium">
                <div className="flex items-start space-x-1">
                  {/* Spacer to align with chevron button in chain headers */}
                  <div className="h-5 w-5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div>
                <div className="flex items-center space-x-2">
                        {/* Icon for standalone transactions (replaces chain link icon) */}
                        <Circle className={`h-4 w-4 flex-shrink-0 fill-current ${
                          transaction.status === 'Open' ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        {/* Alternative options:
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Diamond className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        */}
                        <span className="font-semibold text-sm">{transaction.stockSymbol}</span>
                        <span
                          className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
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
                      </div>
                      <div className="flex items-center space-x-1 mt-1 ml-5">
                        <Badge
                          variant={transaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                          className={`text-xs ${transaction.buyOrSell === 'Buy'
                            ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                            : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50'
                          }`}
                        >
                          {transaction.buyOrSell}
                        </Badge>
                        {transaction.chainId && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                            🔗
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
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
                {transaction.status === 'Open' ? (
                  <span className={`font-medium ${
                    calculateDTE(transaction.expiryDate) <= 7
                      ? 'text-red-600 bg-red-50 px-2 py-1 rounded'
                      : calculateDTE(transaction.expiryDate) <= 30
                      ? 'text-orange-600 bg-orange-50 px-2 py-1 rounded'
                      : 'text-muted-foreground'
                  }`}>
                    {calculateDTE(transaction.expiryDate)}
                  </span>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {transaction.status === 'Expired'
                      ? formatDate(transaction.expiryDate)
                      : transaction.closeDate
                        ? formatDate(transaction.closeDate)
                        : <span className="text-muted-foreground">-</span>
                    }
                  </div>
                )}
              </TableCell>
              <TableCell>
                {calculateDH(transaction.tradeOpenDate, transaction.closeDate)}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span>${transaction.strikePrice.toFixed(2)}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                  </span>
                </div>
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
                    <span className="text-muted-foreground">Loading...</span>
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
                    {(transaction.profitLoss ?? 0) >= 0 ? '+' : ''}{formatPnLNumber(transaction.profitLoss || 0).substring(1)}
                </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  {/* Hide edit button for rolled transactions to prevent data integrity issues */}
                  {transaction.status !== 'Rolled' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div
                      className="h-8 w-8 flex items-center justify-center text-muted-foreground cursor-not-allowed"
                      title="Cannot edit rolled transactions. Delete entire chain to make changes."
                    >
                      <Edit className="h-4 w-4" />
                    </div>
                  )}
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
