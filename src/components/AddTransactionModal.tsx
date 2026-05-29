'use client';

import { useState, useEffect, useMemo } from 'react';
import { OptionsTransaction } from '@/types/options';
import { dateToLocalString, dateToInputString } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import { Loader2 } from 'lucide-react';
import { calculateAvailableShares, calculateProfitLoss as calculateRealPnL } from '@/utils/optionsCalculations';

interface AddTransactionModalProps {
  onClose: () => void;
  onSave: (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
  portfolios?: Array<{ id: string; name: string; isDefault: boolean }>;
  selectedPortfolioId?: string | null;
  transactions?: OptionsTransaction[];
  initialTransactionType?: 'option' | 'stock';
}

export default function AddTransactionModal({ onClose, onSave, portfolios = [], selectedPortfolioId, transactions = [], initialTransactionType }: AddTransactionModalProps) {
  const [formData, setFormData] = useState({
    portfolioId: selectedPortfolioId || portfolios.find(p => p.isDefault)?.id || '',
    stockSymbol: '',
    tradeOpenDate: dateToInputString(new Date()),
    expiryDate: '',
    callOrPut: 'Put' as 'Call' | 'Put',
    buyOrSell: ((initialTransactionType || 'option') === 'option' ? 'Sell' : 'Buy') as 'Buy' | 'Sell',
    strikePrice: 0,
    premium: 0,
    numberOfContracts: 1,
    fees: 0.66, // Default broker fee (0.66 per contract / transaction)
    status: 'Open' as 'Open' | 'Closed' | 'Expired' | 'Assigned',
    stockPriceCurrent: 0, 
    collateralAmount: 0, 
    
    // Stock-specific & coverage fields
    transactionType: (initialTransactionType || 'option') as 'option' | 'stock',
    sharesQuantity: 100,
    sharePrice: 0,
    coveredByType: 'none' as 'none' | 'stock' | 'option',
    coveredById: '',
    exitPrice: 0,
    closeDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update portfolioId when selectedPortfolioId changes
  useEffect(() => {
    if (selectedPortfolioId) {
      setFormData(prev => ({ ...prev, portfolioId: selectedPortfolioId }));
    } else if (portfolios.length > 0) {
      const defaultPortfolio = portfolios.find(p => p.isDefault);
      if (defaultPortfolio) {
        setFormData(prev => ({ ...prev, portfolioId: defaultPortfolio.id }));
      }
    }
  }, [selectedPortfolioId, portfolios]);

  // Fetch available shares and open long calls for the current symbol and portfolio
  const availableSharesInfo = useMemo(() => {
    if (formData.transactionType !== 'option' || !formData.stockSymbol) {
      return { totalShares: 0, committedShares: 0, availableShares: 0, avgPrice: 0 };
    }
    const portfolioTxns = transactions.filter(t => t.portfolioId === formData.portfolioId);
    return calculateAvailableShares(portfolioTxns, formData.stockSymbol);
  }, [transactions, formData.portfolioId, formData.stockSymbol, formData.transactionType]);

  const openLongCalls = useMemo(() => {
    if (formData.transactionType !== 'option' || !formData.stockSymbol) return [];
    return transactions.filter(t =>
      t.portfolioId === formData.portfolioId &&
      t.stockSymbol === formData.stockSymbol &&
      t.transactionType === 'option' &&
      t.buyOrSell === 'Buy' &&
      t.callOrPut === 'Call' &&
      t.status === 'Open'
    );
  }, [transactions, formData.portfolioId, formData.stockSymbol, formData.transactionType]);

  const calculateDaysToExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBreakEven = () => {
    if (formData.transactionType === 'stock') {
      return formData.sharePrice;
    }
    if (formData.callOrPut === 'Call') {
      return formData.strikePrice + formData.premium;
    } else {
      return formData.strikePrice - formData.premium;
    }
  };

  const calculateProfitLoss = () => {
    // Construct a temporary transaction to pass to pure logic
    const tempTx: OptionsTransaction = {
      id: 'temp',
      portfolioId: formData.portfolioId,
      stockSymbol: formData.stockSymbol,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      buyOrSell: formData.buyOrSell,
      status: formData.status,
      fees: formData.fees,
      transactionType: formData.transactionType,
      sharesQuantity: formData.sharesQuantity,
      sharePrice: formData.sharePrice,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
      callOrPut: formData.callOrPut,
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      exitPrice: formData.status === 'Closed' && formData.exitPrice > 0 ? formData.exitPrice : undefined,
      closeDate: formData.closeDate ? new Date(formData.closeDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return calculateRealPnL(tempTx);
  };

  const calculateDaysHeld = () => {
    const openDate = new Date(formData.tradeOpenDate);
    const endDate = formData.status === 'Closed' && formData.closeDate ? new Date(formData.closeDate) : new Date();
    const diffTime = endDate.getTime() - openDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.stockSymbol) newErrors.stockSymbol = 'Stock symbol is required';

    if (formData.transactionType === 'stock') {
      if (formData.sharesQuantity <= 0) newErrors.sharesQuantity = 'Quantity must be greater than 0';
      if (formData.sharePrice <= 0) newErrors.sharePrice = 'Share price must be greater than 0';
      if (formData.status === 'Closed') {
        if (!formData.exitPrice || formData.exitPrice <= 0) newErrors.exitPrice = 'Exit price is required when closed';
        if (!formData.closeDate) newErrors.closeDate = 'Close date is required when closed';
      }
    } else {
      // Option validations
      if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
      if (formData.strikePrice <= 0) newErrors.strikePrice = 'Strike price must be greater than 0';
      if (formData.premium <= 0) newErrors.premium = 'Premium must be greater than 0';
      if (formData.numberOfContracts <= 0) newErrors.numberOfContracts = 'Number of contracts must be greater than 0';
      
      if (formData.status === 'Closed') {
        if (!formData.exitPrice || formData.exitPrice < 0) newErrors.exitPrice = 'Exit price is required when closed';
        if (!formData.closeDate) newErrors.closeDate = 'Close date is required when closed';
      } else if (formData.status === 'Expired' || formData.status === 'Assigned') {
        if (!formData.closeDate) newErrors.closeDate = 'Close date is required';
      }

      // Sell Call Coverage enforcement
      if (formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call') {
        if (formData.coveredByType === 'none') {
          newErrors.coveredByType = 'Covered calls must be covered by stock or a long option. Naked selling is disabled.';
        } else if (formData.coveredByType === 'stock') {
          const reqShares = formData.numberOfContracts * 100;
          if (availableSharesInfo.availableShares < reqShares) {
            newErrors.coveredByType = `Insufficient available stock. You have ${availableSharesInfo.availableShares} shares, but need ${reqShares} shares.`;
          }
        } else if (formData.coveredByType === 'option') {
          if (!formData.coveredById && (!formData.collateralAmount || formData.collateralAmount <= 0)) {
            newErrors.coveredById = 'You must select a covering long call option or specify a collateral override.';
          } else if (formData.coveredById) {
            const coveringLong = openLongCalls.find(t => t.id === formData.coveredById);
            if (coveringLong) {
              const coveringContracts = coveringLong.numberOfContracts || 0;
              if (formData.numberOfContracts > coveringContracts) {
                newErrors.numberOfContracts = `Short call contracts (${formData.numberOfContracts}) cannot exceed covering long contracts (${coveringContracts}).`;
              }
            }
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const breakEvenPrice = calculateBreakEven();
    const profitLoss = calculateProfitLoss();

    const transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      portfolioId: formData.portfolioId,
      stockSymbol: formData.stockSymbol,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      status: formData.status,
      fees: formData.fees,
      transactionType: formData.transactionType,
      buyOrSell: formData.buyOrSell,
      breakEvenPrice,
      profitLoss,
      
      ...(formData.transactionType === 'stock' ? {
        sharesQuantity: formData.sharesQuantity,
        sharePrice: formData.sharePrice,
        exitPrice: formData.status === 'Closed' ? formData.exitPrice : undefined,
        closeDate: formData.status === 'Closed' ? new Date(formData.closeDate) : undefined,
      } : {
        expiryDate: new Date(formData.expiryDate),
        callOrPut: formData.callOrPut,
        strikePrice: formData.strikePrice,
        premium: formData.premium,
        numberOfContracts: formData.numberOfContracts,
        collateralAmount: formData.collateralAmount || undefined,
        coveredByType: formData.coveredByType,
        coveredById: formData.coveredByType === 'option' ? (formData.coveredById || null) : null,
        exitPrice: ['Closed', 'Expired', 'Assigned'].includes(formData.status) ? formData.exitPrice : undefined,
        closeDate: ['Closed', 'Expired', 'Assigned'].includes(formData.status) ? new Date(formData.closeDate) : undefined,
      })
    };

    setIsSubmitting(true);
    try {
      await onSave(transaction);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate fees based on contracts (options: 0.66/contract, stock: default 0)
      if (field === 'numberOfContracts') {
        const contracts = typeof value === 'number' ? value : parseInt(value as string) || 1;
        newData.fees = contracts * 0.66;
      } else if (field === 'transactionType') {
        newData.fees = value === 'option' ? newData.numberOfContracts * 0.66 : 0;
        newData.status = 'Open';
        newData.buyOrSell = value === 'option' ? 'Sell' : 'Buy';
      }

      return newData;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add New Trade"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => handleChange('transactionType', 'option')}
            className={`flex-1 py-2 text-center text-sm font-medium border-b-2 transition-colors ${
              formData.transactionType === 'option'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Option Trade
          </button>
          <button
            type="button"
            onClick={() => handleChange('transactionType', 'stock')}
            className={`flex-1 py-2 text-center text-sm font-medium border-b-2 transition-colors ${
              formData.transactionType === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock Trade
          </button>
        </div>

        {/* Portfolio */}
        <div className="space-y-2">
          <Label htmlFor="portfolioId">Portfolio</Label>
          <Select value={formData.portfolioId} onValueChange={(value) => handleChange('portfolioId', value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} {portfolio.isDefault ? '(Default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Symbol and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stockSymbol" className={errors.stockSymbol ? 'text-destructive' : ''}>
              Stock Symbol
            </Label>
            <Input
              id="stockSymbol"
              type="text"
              value={formData.stockSymbol}
              onChange={(e) => handleChange('stockSymbol', e.target.value.toUpperCase())}
              className={errors.stockSymbol ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
              placeholder="AAPL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                {formData.transactionType === 'option' && <SelectItem value="Expired">Expired</SelectItem>}
                {formData.transactionType === 'option' && <SelectItem value="Assigned">Assigned</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Render Option Fields */}
        {formData.transactionType === 'option' && (
          <>
            {/* Action and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyOrSell">Action</Label>
                <Select value={formData.buyOrSell} onValueChange={(value) => handleChange('buyOrSell', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="callOrPut">Type</Label>
                <Select value={formData.callOrPut} onValueChange={(value) => handleChange('callOrPut', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select option type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call">Call</SelectItem>
                    <SelectItem value="Put">Put</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Open Date and Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tradeOpenDate">Open Date</Label>
                <Input
                  id="tradeOpenDate"
                  type="date"
                  value={formData.tradeOpenDate}
                  onChange={(e) => handleChange('tradeOpenDate', e.target.value)}
                  className="w-full appearance-none min-h-[2.5rem]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate" className={errors.expiryDate ? 'text-destructive' : ''}>
                  Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={errors.expiryDate ? 'border-destructive focus-visible:ring-destructive w-full appearance-none min-h-[2.5rem]' : 'w-full appearance-none min-h-[2.5rem]'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strikePrice" className={errors.strikePrice ? 'text-destructive' : ''}>
                  Strike Price
                </Label>
                <Input
                  id="strikePrice"
                  type="number"
                  step="0.01"
                  value={formData.strikePrice || ''}
                  onChange={(e) => handleChange('strikePrice', parseFloat(e.target.value) || 0)}
                  className={errors.strikePrice ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="premium" className={errors.premium ? 'text-destructive' : ''}>
                  Premium
                </Label>
                <Input
                  id="premium"
                  type="number"
                  step="0.01"
                  value={formData.premium || ''}
                  onChange={(e) => handleChange('premium', parseFloat(e.target.value) || 0)}
                  className={errors.premium ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfContracts" className={errors.numberOfContracts ? 'text-destructive' : ''}>
                  Contracts
                </Label>
                <Input
                  id="numberOfContracts"
                  type="number"
                  value={formData.numberOfContracts}
                  onChange={(e) => handleChange('numberOfContracts', parseInt(e.target.value) || 1)}
                  className={errors.numberOfContracts ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fees">Fees</Label>
                <Input
                  id="fees"
                  type="number"
                  step="0.01"
                  value={formData.fees}
                  onChange={(e) => handleChange('fees', parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Coverage Selection - For Covered Call / Spread */}
            {formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md space-y-3 border border-blue-200 dark:border-blue-900">
                <div className="space-y-2">
                  <Label htmlFor="coveredByType" className={errors.coveredByType ? 'text-destructive font-medium' : ''}>
                    Coverage Type
                  </Label>
                  <Select value={formData.coveredByType} onValueChange={(value) => handleChange('coveredByType', value)}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select coverage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock Position</SelectItem>
                      <SelectItem value="option">Long Call (PMCC)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.coveredByType && <p className="text-xs text-destructive mt-1">{errors.coveredByType}</p>}
                </div>

                {formData.coveredByType === 'stock' && (
                  <div className="space-y-3">
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p>Available Shares: <span className="font-semibold">{availableSharesInfo.availableShares}</span></p>
                      <p>Required Shares: <span className="font-semibold">{formData.numberOfContracts * 100}</span> (100 shares per contract)</p>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-blue-200/50 dark:border-blue-900/50">
                      <Label htmlFor="collateralAmount" className="text-xs">
                        Collateral Override ($) <span className="text-muted-foreground text-[10px] ml-1">(Optional)</span>
                      </Label>
                      <Input
                        id="collateralAmount"
                        type="number"
                        step="0.01"
                        value={formData.collateralAmount || ''}
                        onChange={(e) => handleChange('collateralAmount', parseFloat(e.target.value) || 0)}
                        className="bg-background h-8 text-xs"
                        placeholder="Override custom collateral"
                      />
                    </div>
                  </div>
                )}

                {formData.coveredByType === 'option' && (
                  <div className="space-y-3 pt-1 border-t border-blue-200/50 dark:border-blue-900/50">
                    <div className="space-y-2">
                      <Label htmlFor="coveredById" className={errors.coveredById ? 'text-destructive font-medium' : ''}>
                        Link a Covering Long Call
                      </Label>
                      {openLongCalls.length === 0 ? (
                        <p className="text-xs text-destructive font-medium">No open long call options found for {formData.stockSymbol || 'this symbol'}.</p>
                      ) : (
                        <Select value={formData.coveredById} onValueChange={(value) => handleChange('coveredById', value)}>
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select long call..." />
                          </SelectTrigger>
                          <SelectContent>
                            {openLongCalls.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                Expiry: {t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : 'N/A'}, Strike: ${t.strikePrice} ({t.numberOfContracts} contract{t.numberOfContracts !== 1 ? 's' : ''})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {errors.coveredById && <p className="text-xs text-destructive mt-1">{errors.coveredById}</p>}
                    </div>

                    <div className="flex items-center justify-center gap-2 py-1">
                      <div className="h-px bg-blue-200 dark:bg-blue-900/50 flex-1"></div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-transparent px-1 select-none">OR</span>
                      <div className="h-px bg-blue-200 dark:bg-blue-900/50 flex-1"></div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="collateralAmount" className={errors.coveredById ? 'text-destructive font-medium' : ''}>
                        Manual Collateral Override ($)
                      </Label>
                      <Input
                        id="collateralAmount"
                        type="number"
                        step="0.01"
                        value={formData.collateralAmount || ''}
                        onChange={(e) => handleChange('collateralAmount', parseFloat(e.target.value) || 0)}
                        className="bg-background"
                        placeholder="Required if not linking (e.g. $5,000)"
                      />
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        If you do not link a covering call above, you must specify your manual collateral override here.
                      </p>
                    </div>
                  </div>
                )}

                {formData.coveredByType === 'none' && (
                  <div className="space-y-2 pt-1 border-t border-blue-200/50 dark:border-blue-900/50">
                    <Label htmlFor="collateralAmount">
                      Collateral Override ($) <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
                    </Label>
                    <Input
                      id="collateralAmount"
                      type="number"
                      step="0.01"
                      value={formData.collateralAmount || ''}
                      onChange={(e) => handleChange('collateralAmount', parseFloat(e.target.value) || 0)}
                      className="bg-background"
                      placeholder="Override naked strike collateral"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Render Stock Fields */}
        {formData.transactionType === 'stock' && (
          <>
            {/* Action and Open Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyOrSell">Action</Label>
                <Select value={formData.buyOrSell} onValueChange={(value) => handleChange('buyOrSell', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeOpenDate">Open Date</Label>
                <Input
                  id="tradeOpenDate"
                  type="date"
                  value={formData.tradeOpenDate}
                  onChange={(e) => handleChange('tradeOpenDate', e.target.value)}
                  className="w-full appearance-none min-h-[2.5rem]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sharesQuantity" className={errors.sharesQuantity ? 'text-destructive' : ''}>
                  Quantity (Shares)
                </Label>
                <Input
                  id="sharesQuantity"
                  type="number"
                  value={formData.sharesQuantity || ''}
                  onChange={(e) => handleChange('sharesQuantity', parseInt(e.target.value) || 0)}
                  className={errors.sharesQuantity ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sharePrice" className={errors.sharePrice ? 'text-destructive' : ''}>
                  Share Purchase Price
                </Label>
                <Input
                  id="sharePrice"
                  type="number"
                  step="0.01"
                  value={formData.sharePrice || ''}
                  onChange={(e) => handleChange('sharePrice', parseFloat(e.target.value) || 0)}
                  className={errors.sharePrice ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                step="0.01"
                value={formData.fees}
                onChange={(e) => handleChange('fees', parseFloat(e.target.value) || 0)}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Exit details for Closed status */}
        {formData.status === 'Closed' && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-md space-y-3 border border-orange-200 dark:border-orange-900">
            <h4 className="text-xs font-semibold text-orange-800 dark:text-orange-300">Exit Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exitPrice" className={errors.exitPrice ? 'text-destructive' : ''}>Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.01"
                  value={formData.exitPrice || ''}
                  onChange={(e) => handleChange('exitPrice', parseFloat(e.target.value) || 0)}
                  className={errors.exitPrice ? 'border-destructive focus-visible:ring-destructive w-full bg-background' : 'w-full bg-background'}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeDate" className={errors.closeDate ? 'text-destructive' : ''}>Close Date</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => handleChange('closeDate', e.target.value)}
                  className={errors.closeDate ? 'border-destructive focus-visible:ring-destructive w-full appearance-none min-h-[2.5rem] bg-background' : 'w-full appearance-none min-h-[2.5rem] bg-background'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Open Option Exit Details (Expired / Assigned) */}
        {formData.transactionType === 'option' && ['Expired', 'Assigned'].includes(formData.status) && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-md space-y-3 border border-orange-200 dark:border-orange-900">
            <h4 className="text-xs font-semibold text-orange-800 dark:text-orange-300">Close details ({formData.status})</h4>
            <div className="space-y-2">
              <Label htmlFor="closeDate" className={errors.closeDate ? 'text-destructive' : ''}>Close Date</Label>
              <Input
                id="closeDate"
                type="date"
                value={formData.closeDate}
                onChange={(e) => handleChange('closeDate', e.target.value)}
                className={errors.closeDate ? 'border-destructive focus-visible:ring-destructive w-full appearance-none min-h-[2.5rem] bg-background' : 'w-full appearance-none min-h-[2.5rem] bg-background'}
              />
            </div>
          </div>
        )}

        {/* Calculated Info Box */}
        <div className="bg-muted p-3 rounded-md">
          <h4 className="text-sm font-medium text-card-foreground mb-2">Calculated Fields</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-card-foreground">
            <div>
              <span className="text-muted-foreground">Days Held:</span>
              <span className="ml-2 font-medium">{calculateDaysHeld()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Break Even:</span>
              <span className="ml-2 font-medium">${calculateBreakEven().toFixed(2)}</span>
            </div>
            {formData.transactionType === 'option' && (
              <div>
                <span className="text-muted-foreground">Days to Expiry:</span>
                <span className="ml-2 font-medium">{formData.expiryDate ? calculateDaysToExpiry(formData.expiryDate) : '-'}</span>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-muted-foreground">Current P&L:</span>
              <span className={`ml-2 font-medium ${calculateProfitLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${calculateProfitLoss().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Trade'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
