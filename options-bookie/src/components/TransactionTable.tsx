'use client';

import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronDown, ChevronRight, Link, Circle } from 'lucide-react';
import { useStockPrices } from '@/hooks/useStockPrices';
import StockPriceDisplay, { ITMIndicator } from '@/components/StockPriceDisplay';
import { calculateDTE, calculateDH, formatPnLNumber, calculateChainPnL, calculateCollateral, calculateRoR, calculateChainCollateral, calculateChainRoR } from '@/utils/optionsCalculations';
import { formatDisplayDateShort } from '@/utils/dateUtils';
import { getTransactionRowClass, formatStrikePrice, isLEAP } from '@/utils/formatUtils';
import PnLDisplay from '@/components/PnLDisplay';
import { useIsMobile } from '@/hooks/useMediaQuery';
import Tooltip from '@/components/ui/tooltip';

interface TransactionTableProps {
  transactions: OptionsTransaction[];
  onDelete: (id: string) => void;
  onDeleteChain?: (chainId: string) => void;
  onEdit: (transaction: OptionsTransaction) => void;
  portfolios?: Portfolio[];
  showPortfolioColumn?: boolean;
  chains?: TradeChain[];
  showHeader?: boolean;
  compact?: boolean;
}

export default function TransactionTable({
  transactions,
  onDelete,
  onDeleteChain,
  onEdit,
  portfolios = [],
  showPortfolioColumn = false,
  chains = [],
  showHeader = true,
  compact = false,
}: TransactionTableProps) {
  const isMobile = useIsMobile();
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
  const { stockPrices, isAvailable: pricesAvailable } = useStockPrices(stockSymbols);

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
    const { monthDay, year } = formatDisplayDateShort(date);

    if (monthDay === 'Invalid') {
      return <span>Invalid Date</span>;
    }

    return (
      <div className="flex flex-col">
        <span>{monthDay}</span>
        <span className="text-xs text-muted-foreground">{year}</span>
      </div>
    );
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
      case 'Expired':
      case 'Assigned':
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
      case 'Rolled':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50';
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
      <Table>
        {showHeader && (
          <TableHeader className={compact ? "text-xs" : ""}>
            <TableRow className={compact ? "h-8" : ""}>
            <TableHead
              className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""} group`}
              onClick={() => handleSort('stockSymbol')}
            >
              <Tooltip content="Stock symbol for the options contract">
                <div className="flex items-center space-x-1 w-full h-full">
                  <div className={`${compact ? "h-3 w-3" : "h-5 w-5"} flex-shrink-0`}></div>
                  <div className="flex items-center space-x-2">
                    <div className={`${compact ? "h-2 w-2" : "h-4 w-4"} flex-shrink-0`}></div>
                    <span className={compact ? "text-xs" : ""}>Symbol</span>
                  </div>
                </div>
              </Tooltip>
            </TableHead>
            {!isMobile && showPortfolioColumn && (
              <TableHead className={`${compact ? "px-2 py-1 text-xs" : ""} group`}>
                <Tooltip content="Portfolio this trade belongs to">
                  <span className={compact ? "text-xs" : ""}>Portfolio</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""} group`}
                onClick={() => handleSort('tradeOpenDate')}
              >
                <Tooltip content="Date when the trade was opened">
                  <span className={compact ? "text-xs" : ""}>Opened</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 hidden lg:table-cell ${compact ? "px-2 py-1" : ""}`}
                onClick={() => handleSort('expiryDate')}
              >
                <span className={compact ? "text-xs" : ""}>Expires</span>
              </TableHead>
            )}
            <TableHead className={`${compact ? "px-2 py-1" : ""}`}>
              <Tooltip content="Days to Expiry for open trades, Close date for finished trades">
                <span className={compact ? "text-xs" : ""}>DTE</span>
              </Tooltip>
            </TableHead>
            {!isMobile && (
              <TableHead className={`hidden lg:table-cell ${compact ? "px-2 py-1" : ""}`}>
                <Tooltip content="Days Held">
                  <span className={compact ? "text-xs" : ""}>DH</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""}`}
                onClick={() => handleSort('strikePrice')}
              >
                <Tooltip content="Strike price of the options contract">
                  <span className={compact ? "text-xs" : ""}>Strike</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && pricesAvailable && (
              <TableHead className={`hidden xl:table-cell ${compact ? "px-2 py-1" : ""}`}>
                <Tooltip content="Current stock price with daily change">
                  <span className={compact ? "text-xs" : ""}>Current Price</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""}`}
                onClick={() => handleSort('premium')}
              >
                <Tooltip content="Collateral required for this trade">
                  <span className={compact ? "text-xs" : ""}>Collateral</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 hidden lg:table-cell ${compact ? "px-2 py-1" : ""}`}
                onClick={() => handleSort('profitLoss')}
              >
                <Tooltip content="Return on Risk percentage">
                  <span className={compact ? "text-xs" : ""}>RoR%</span>
                </Tooltip>
              </TableHead>
            )}
            {!isMobile && (
              <TableHead
                className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""}`}
                onClick={() => handleSort('status')}
              >
                <Tooltip content="Current status: Open, Closed, Rolled, Expired, or Assigned">
                  <span className={compact ? "text-xs" : ""}>Status</span>
                </Tooltip>
              </TableHead>
            )}
            <TableHead
              className={`cursor-pointer hover:bg-muted/50 ${compact ? "px-2 py-1" : ""}`}
              onClick={() => handleSort('profitLoss')}
            >
              <Tooltip content="Profit or Loss for this trade (realized or unrealized)">
                <span className={compact ? "text-xs" : ""}>P&L</span>
              </Tooltip>
            </TableHead>
            <TableHead className={compact ? "px-2 py-1" : ""}>
              <span className={compact ? "text-xs" : ""}>{isMobile ? 'Edit' : 'Actions'}</span>
            </TableHead>
          </TableRow>
          </TableHeader>
        )}
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
                          {!isMobile && <Link className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                          <span className="font-semibold text-sm">{activeTransaction.stockSymbol} Chain</span>
                          {!isMobile && (
                            <span
                              className="text-xs bg-gray-200 dark:bg-gray-950/30 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded flex-shrink-0"
                              title="Number of Trades"
                            >
                              {chainTransactions.length} trades
                            </span>
                          )}
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
                  {!isMobile && showPortfolioColumn && <TableCell></TableCell>}
                  {!isMobile && <TableCell></TableCell>}
                  {!isMobile && <TableCell className="hidden lg:table-cell"></TableCell>}
                  <TableCell></TableCell>
                  {!isMobile && <TableCell className="hidden lg:table-cell"></TableCell>}
                  {!isMobile && <TableCell></TableCell>}
                  {!isMobile && pricesAvailable && <TableCell className="hidden xl:table-cell"></TableCell>}
                  {!isMobile && (
                    <TableCell>
                      <span className="font-medium text-muted-foreground">
                        ${formatPnLNumber(calculateChainCollateral(chainId, transactions)).slice(1)}
                      </span>
                      <div className="text-xs text-muted-foreground font-normal">Total Collateral</div>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell className="hidden lg:table-cell">
                      <span className={`font-medium text-sm ${
                        calculateChainRoR(chainId, transactions) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.round(calculateChainRoR(chainId, transactions))}%
                      </span>
                      <div className="text-xs text-muted-foreground font-normal">Chain RoR</div>
                    </TableCell>
                  )}
                  {!isMobile && (
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
                  )}
                  <TableCell>
                    <PnLDisplay amount={chainPnL} className="font-bold" showZero />
                    <div className="text-xs text-muted-foreground font-normal">Chain P&L</div>
                  </TableCell>
                  <TableCell>
                    {!isMobile && onDeleteChain && (
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
                      className={getTransactionRowClass(transaction.status, true)}
                    >
                      <TableCell className="font-medium pl-8">
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">└─</span>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span>{transaction.stockSymbol}</span>
                              <span
                                className="text-xs bg-gray-200 dark:bg-gray-950/30 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded"
                                title="Number of Contracts"
                              >
                                {transaction.numberOfContracts}
                              </span>
                              <div className="w-12 h-5 flex items-center justify-center">
                                {!isMobile && stockPrices[transaction.stockSymbol] && transaction.status === 'Open' && (
                                  <ITMIndicator
                                    currentPrice={stockPrices[transaction.stockSymbol]!.price}
                                    strikePrice={transaction.strikePrice}
                                    optionType={transaction.callOrPut}
                                  />
                                )}
                              </div>
                              {!isMobile && isLast && transaction.status === 'Open' && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">
                                  Current
                                </Badge>
                              )}
                            </div>
                            {isMobile && (
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                <span>${formatStrikePrice(transaction.strikePrice)}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {!isMobile && showPortfolioColumn && (
                        <TableCell>
                          {portfolios.find(p => p.id === transaction.portfolioId)?.name || 'Unknown'}
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          {formatDate(transaction.tradeOpenDate)}
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell className="hidden lg:table-cell">
                          {formatDate(transaction.expiryDate)}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col items-start">
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
                          {isLEAP(transaction) && (
                            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-1">
                              LEAP
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {!isMobile && (
                        <TableCell className="hidden lg:table-cell">{calculateDH(transaction.tradeOpenDate, transaction.closeDate)}</TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>${formatStrikePrice(transaction.strikePrice)}</span>
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
                      )}
                      {!isMobile && pricesAvailable && (
                        <TableCell className="hidden xl:table-cell">
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
                      {!isMobile && (
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            ${transaction.premium.toFixed(2)}
                          </span>
                          <div className="text-xs text-muted-foreground font-normal">Premium</div>
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-muted-foreground text-sm">-</span>
                        </TableCell>
                      )}
                      {!isMobile && (
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
                      )}
                      <TableCell>
                        <PnLDisplay amount={transaction.profitLoss || 0} />
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
                          {!isMobile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(transaction.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
                  className={getTransactionRowClass(transaction.status, false)}
            >
              <TableCell className="font-medium">
                <div className="flex items-start space-x-1">
                  {/* Spacer to align with chevron button in chain headers */}
                  {!isMobile && <div className="h-5 w-5 flex-shrink-0"></div>}
                  <div className="flex-1 min-w-0">
                    <div>
                      <div className="flex items-start space-x-2">
                        {/* Icon for standalone transactions (replaces chain link icon) */}
                        <Circle className={`h-4 w-4 flex-shrink-0 fill-current mt-0.5 ${
                          transaction.status === 'Open' ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm">{transaction.stockSymbol}</span>
                            <span
                              className="text-xs bg-gray-200 dark:bg-gray-950/30 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded"
                              title="Number of Contracts"
                            >
                              {transaction.numberOfContracts}
                            </span>
                            <div className="w-12 h-5 flex items-center justify-center">
                              {!isMobile && stockPrices[transaction.stockSymbol] && transaction.status === 'Open' && (
                                <ITMIndicator
                                  currentPrice={stockPrices[transaction.stockSymbol]!.price}
                                  strikePrice={transaction.strikePrice}
                                  optionType={transaction.callOrPut}
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 mt-1 ml-0">
                            {isMobile && (
                              <span className="text-xs text-muted-foreground">
                                ${formatStrikePrice(transaction.strikePrice)}
                              </span>
                            )}
                            {isMobile && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${transaction.callOrPut === 'Call'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {transaction.callOrPut === 'Call' ? 'C' : 'P'}
                              </span>
                            )}
                            <Badge
                              variant={transaction.buyOrSell === 'Buy' ? 'outline' : 'default'}
                              className={`text-xs ${transaction.buyOrSell === 'Buy'
                                ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-950/50'
                                : 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-950/50'
                              }`}
                            >
                              {transaction.buyOrSell}
                            </Badge>
                            {!isMobile && transaction.chainId && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                                🔗
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TableCell>
              {!isMobile && showPortfolioColumn && (
                <TableCell>
                  {getPortfolioName(transaction.portfolioId)}
                </TableCell>
              )}
              {!isMobile && (
                <TableCell>
                {formatDate(transaction.tradeOpenDate)}
                </TableCell>
              )}
              {!isMobile && (
                <TableCell className="hidden lg:table-cell">
                  {formatDate(transaction.expiryDate)}
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-col items-start">
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
                  {isLEAP(transaction) && (
                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-1">
                      LEAP
                    </Badge>
                  )}
                </div>
              </TableCell>
              {!isMobile && (
                <TableCell className="hidden lg:table-cell">
                  {calculateDH(transaction.tradeOpenDate, transaction.closeDate)}
                </TableCell>
              )}
              {!isMobile && (
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>${formatStrikePrice(transaction.strikePrice)}</span>
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
              )}
              {!isMobile && pricesAvailable && (
                <TableCell className="hidden xl:table-cell">
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
              {!isMobile && (
                <TableCell>
                  <span className="font-medium text-muted-foreground">
                    ${formatPnLNumber(calculateCollateral(transaction)).slice(1)}
                </span>
                </TableCell>
              )}
              {!isMobile && (
                <TableCell className="hidden lg:table-cell">
                  <span className={`font-medium text-sm ${
                    calculateRoR(transaction) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(calculateRoR(transaction))}%
                  </span>
                </TableCell>
              )}
              {!isMobile && (
                <TableCell>
                  <Badge
                    variant={transaction.status === 'Open' ? 'default' : 'secondary'}
                    className={getStatusColor(transaction.status)}
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                <PnLDisplay amount={transaction.profitLoss || 0} />
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
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(transaction.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
