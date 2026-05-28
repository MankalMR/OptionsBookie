'use client';

import React, { useState, useMemo } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStockPrices } from '@/hooks/useStockPrices';
import { Edit, Trash2, ChevronDown, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { formatDisplayDateShort } from '@/utils/dateUtils';
import Tooltip from '@/components/ui/tooltip';

const formatDate = (date: Date | string | undefined) => {
  if (!date) {
    return '-';
  }
  const { monthDay, year } = formatDisplayDateShort(date);
  if (monthDay === 'Invalid') {
    return 'Invalid Date';
  }
  return `${monthDay}, ${year}`;
};

interface StockHoldingsTabProps {
  transactions: OptionsTransaction[];
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  onEdit: (transaction: OptionsTransaction) => void;
  onDelete: (id: string) => void;
  onAddStockClick: () => void;
}

export default function StockHoldingsTab({
  transactions,
  portfolios,
  selectedPortfolioId,
  onEdit,
  onDelete,
  onAddStockClick,
}: StockHoldingsTabProps) {
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Filter transactions for the selected portfolio
  const portfolioTxns = useMemo(() => {
    if (selectedPortfolioId) {
      return transactions.filter(t => t.portfolioId === selectedPortfolioId);
    }
    return transactions;
  }, [transactions, selectedPortfolioId]);

  // Extract open stock buy transactions (lots)
  const openStockLots = useMemo(() => {
    return portfolioTxns.filter(t =>
      t.transactionType === 'stock' &&
      t.buyOrSell === 'Buy' &&
      t.status === 'Open'
    );
  }, [portfolioTxns]);

  // Get unique tickers of open stock lots to fetch prices
  const uniqueTickers = useMemo(() => {
    return [...new Set(openStockLots.map(l => l.stockSymbol))].sort();
  }, [openStockLots]);

  // Fetch current stock prices
  const { stockPrices, isAvailable: pricesAvailable, loading: pricesLoading } = useStockPrices(uniqueTickers);

  // Group and calculate stats per ticker
  const groupedPositions = useMemo(() => {
    return uniqueTickers.map(ticker => {
      const lots = openStockLots.filter(l => l.stockSymbol === ticker);
      const totalShares = lots.reduce((sum, l) => sum + (l.sharesQuantity || 0), 0);
      const totalCost = lots.reduce((sum, l) => sum + ((l.sharesQuantity || 0) * (l.sharePrice || 0)), 0);
      const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
      
      const currentPrice = stockPrices[ticker]?.price || avgPrice;
      const marketValue = totalShares * currentPrice;
      const unrealizedPnL = marketValue - totalCost;
      const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

      // Calculate committed shares locked by open Covered Calls in the portfolio
      const openShortCalls = portfolioTxns.filter(t =>
        t.stockSymbol === ticker &&
        t.transactionType === 'option' &&
        t.buyOrSell === 'Sell' &&
        t.callOrPut === 'Call' &&
        t.status === 'Open' &&
        t.coveredByType === 'stock'
      );
      const committedShares = openShortCalls.reduce((sum, t) => sum + ((t.numberOfContracts || 0) * 100), 0);
      const availableShares = Math.max(0, totalShares - committedShares);

      return {
        ticker,
        lots,
        totalShares,
        avgPrice,
        currentPrice,
        costBasis: totalCost,
        marketValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        committedShares,
        availableShares,
      };
    });
  }, [uniqueTickers, openStockLots, stockPrices, portfolioTxns]);

  // Overall holdings summary statistics
  const summaryStats = useMemo(() => {
    const totalCostBasis = groupedPositions.reduce((sum, p) => sum + p.costBasis, 0);
    const totalMarketValue = groupedPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPnL = totalMarketValue - totalCostBasis;
    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    return {
      totalCostBasis,
      totalMarketValue,
      totalPnL,
      totalPnLPercent,
    };
  }, [groupedPositions]);

  const toggleTicker = (ticker: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPnLPercent = (percent: number) => {
    const prefix = percent >= 0 ? '+' : '';
    return `${prefix}${percent.toFixed(2)}%`;
  };

  const getPnLColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Holdings Header Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card shadow-sm border border-border">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Stock Value</p>
            <h3 className="text-2xl font-bold text-card-foreground mt-1">{formatCurrency(summaryStats.totalMarketValue)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border border-border">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost Basis</p>
            <h3 className="text-2xl font-bold text-card-foreground mt-1">{formatCurrency(summaryStats.totalCostBasis)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border border-border">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unrealized P&L</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <h3 className={`text-2xl font-bold ${getPnLColor(summaryStats.totalPnL)}`}>
                {formatCurrency(summaryStats.totalPnL)}
              </h3>
              <span className={`text-sm font-semibold ${getPnLColor(summaryStats.totalPnL)}`}>
                ({formatPnLPercent(summaryStats.totalPnLPercent)})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">Stock Holdings</h2>
            <p className="text-sm text-muted-foreground">Open stock positions and options coverage allocation.</p>
          </div>
          <Button onClick={onAddStockClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Stock Position
          </Button>
        </div>
        
        {groupedPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-lg font-semibold text-card-foreground">No Stock Positions Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add stock buy transactions to track your shares and allocate them as covered call collateral.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                  <TableHead className="text-right">Coverage / Commitment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedPositions.map((position) => {
                  const isExpanded = expandedTickers.has(position.ticker);
                  const isPnlPositive = position.unrealizedPnL >= 0;

                  return (
                    <React.Fragment key={position.ticker}>
                      {/* Ticker Row */}
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleTicker(position.ticker)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            onClick={() => toggleTicker(position.ticker)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-semibold text-card-foreground text-base">
                          {position.ticker}
                        </TableCell>
                        <TableCell className="text-right font-medium">{position.totalShares}</TableCell>
                        <TableCell className="text-right">{formatCurrency(position.avgPrice)}</TableCell>
                        <TableCell className="text-right">
                          {pricesLoading ? (
                            <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
                          ) : (
                            formatCurrency(position.currentPrice)
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(position.costBasis)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(position.marketValue)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={getPnLColor(position.unrealizedPnL)}>
                            {formatCurrency(position.unrealizedPnL)} ({formatPnLPercent(position.unrealizedPnLPercent)})
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-card-foreground font-semibold">
                              {position.committedShares} / {position.totalShares} committed
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              ({position.availableShares} available)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Lots Detail Row (Expanded) */}
                      {isExpanded && (
                        <TableRow className="bg-muted/10">
                          <TableCell colSpan={9} className="p-0 border-b border-border">
                            <div className="px-12 py-3 bg-muted/20 border-t border-border">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Buy Lots</h4>
                              <Table className="border border-border rounded overflow-hidden">
                                <TableHeader className="bg-muted/30">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 py-1 text-xs">Date Purchased</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Shares</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Buy Price</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Cost Basis</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Current Price</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Unrealized P&L</TableHead>
                                    <TableHead className="h-8 py-1 text-xs text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {position.lots.map((lot) => {
                                    const lotShares = lot.sharesQuantity || 0;
                                    const lotPrice = lot.sharePrice || 0;
                                    const lotCost = lotShares * lotPrice;
                                    const currentLotPrice = stockPrices[position.ticker]?.price || lotPrice;
                                    const lotVal = lotShares * currentLotPrice;
                                    const lotPnL = lotVal - lotCost;
                                    const lotPnLPercent = lotCost > 0 ? (lotPnL / lotCost) * 100 : 0;

                                    const isDeleteDisabled = position.totalShares - lotShares < position.committedShares;

                                    return (
                                      <TableRow key={lot.id} className="hover:bg-muted/40 transition-colors">
                                        <TableCell className="py-2 text-sm">{formatDate(lot.tradeOpenDate)}</TableCell>
                                        <TableCell className="py-2 text-sm text-right font-medium">{lotShares}</TableCell>
                                        <TableCell className="py-2 text-sm text-right">{formatCurrency(lotPrice)}</TableCell>
                                        <TableCell className="py-2 text-sm text-right">{formatCurrency(lotCost)}</TableCell>
                                        <TableCell className="py-2 text-sm text-right">
                                          {formatCurrency(currentLotPrice)}
                                        </TableCell>
                                        <TableCell className="py-2 text-sm text-right font-medium">
                                          <span className={getPnLColor(lotPnL)}>
                                            {formatCurrency(lotPnL)} ({formatPnLPercent(lotPnLPercent)})
                                          </span>
                                        </TableCell>
                                        <TableCell className="py-2 text-sm text-right">
                                          <div className="flex justify-end space-x-1">
                                            <Tooltip content="Edit lot">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                                                onClick={() => onEdit(lot)}
                                              >
                                                <Edit className="h-3.5 w-3.5" />
                                              </Button>
                                            </Tooltip>
                                            {isDeleteDisabled ? (
                                              <Tooltip content={`Cannot delete lot: Required as collateral for open covered calls (${position.committedShares} shares required, deleting this would leave only ${position.totalShares - lotShares} shares)`}>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 text-muted-foreground/45 cursor-not-allowed"
                                                  disabled
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </Tooltip>
                                            ) : (
                                              <Tooltip content="Delete lot">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
                                                  onClick={() => onDelete(lot.id)}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
