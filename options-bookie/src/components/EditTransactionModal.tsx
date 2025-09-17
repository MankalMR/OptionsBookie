'use client';

import { useState, useMemo } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import { calculateProfitLoss, calculateDaysHeld } from '@/utils/optionsCalculations';
import { dateToLocalString } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';

interface EditTransactionModalProps {
  transaction: OptionsTransaction;
  onClose: () => void;
  onSave: (id: string, updates: Partial<OptionsTransaction>) => void;
  portfolios?: Portfolio[];
}

export default function EditTransactionModal({ transaction, onClose, onSave, portfolios = [] }: EditTransactionModalProps) {
  // Ensure dates are Date objects
  const tradeOpenDate = transaction.tradeOpenDate instanceof Date
    ? transaction.tradeOpenDate
    : new Date(transaction.tradeOpenDate);
  const expiryDate = transaction.expiryDate instanceof Date
    ? transaction.expiryDate
    : new Date(transaction.expiryDate);
  const closeDate = transaction.closeDate
    ? (transaction.closeDate instanceof Date ? transaction.closeDate : new Date(transaction.closeDate))
    : undefined;

  const [formData, setFormData] = useState({
    portfolioId: transaction.portfolioId || '',
    stockSymbol: transaction.stockSymbol,
    tradeOpenDate: dateToLocalString(tradeOpenDate),
    expiryDate: dateToLocalString(expiryDate),
    callOrPut: transaction.callOrPut,
    buyOrSell: transaction.buyOrSell,
    strikePrice: transaction.strikePrice,
    premium: transaction.premium,
    numberOfContracts: transaction.numberOfContracts,
    fees: transaction.fees || (transaction.numberOfContracts * 0.66), // Auto-calculate if no fees set
    status: transaction.status,
    exitPrice: transaction.exitPrice || 0,
    closeDate: closeDate ? dateToLocalString(closeDate) : '',
    // Roll fields
    newExpiryDate: '',
    newStrikePrice: transaction.strikePrice,
    newPremium: 0,
    exitPremium: 0,
        rollFees: transaction.numberOfContracts * 0.66, // Roll fee per contract
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateDaysToExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBreakEvenPrice = () => {
    if (formData.callOrPut === 'Call') {
      return formData.strikePrice + formData.premium;
    } else {
      return formData.strikePrice - formData.premium;
    }
  };

  const calculateCurrentProfitLoss = () => {
    // For rolled trades, calculate P&L for display (without double-deducting fees)
    if (formData.status === 'Rolled') {
      return calculateRolledDisplayProfitLoss();
    }

    // For closed trades, use the exit price to calculate actual P&L
    if (formData.status === 'Closed' && formData.exitPrice > 0) {
      const tempTransaction: OptionsTransaction = {
        ...transaction,
        stockSymbol: formData.stockSymbol,
        callOrPut: formData.callOrPut,
        buyOrSell: formData.buyOrSell,
        strikePrice: formData.strikePrice,
        premium: formData.premium,
        numberOfContracts: formData.numberOfContracts,
        tradeOpenDate: tradeOpenDate,
        expiryDate: expiryDate,
        closeDate: closeDate,
      };
      return calculateProfitLoss(tempTransaction, formData.exitPrice);
    }

    // For open trades, P&L is based purely on premium (not stock price)
    // This represents the unrealized P&L from the premium received/paid
    const contracts = formData.numberOfContracts;
    const premium = formData.premium;

    if (formData.buyOrSell === 'Buy') {
      // If you bought the option, you paid the premium (negative P&L until closed)
      return -premium * contracts * 100;
    } else {
      // If you sold the option, you received the premium (positive P&L until closed)
      return premium * contracts * 100;
    }
  };


  const calculateRolledDisplayProfitLoss = () => {
    // Universal P&L calculation: always deduct fees for consistency
    const exitPremium = parseFloat(String(formData.exitPremium || '0')) || 0;
    if (exitPremium <= 0) {
      return 0;
    }

    let profitLoss = 0;
    if (formData.buyOrSell === 'Sell') {
      // Sold originally (received premium), buying back at exit premium
      profitLoss = (formData.premium - exitPremium) * formData.numberOfContracts * 100;
    } else {
      // Bought originally (paid premium), selling at exit premium
      profitLoss = (exitPremium - formData.premium) * formData.numberOfContracts * 100;
    }

    // Universal rule: always deduct fees from P&L
    profitLoss -= formData.fees;

    return profitLoss;
  };

  const calculateFinalProfitLoss = () => {
    if (!formData.exitPrice || formData.exitPrice <= 0) {
      return 0;
    }

    const tempTransaction: OptionsTransaction = {
      ...transaction,
      stockSymbol: formData.stockSymbol,
      callOrPut: formData.callOrPut,
      buyOrSell: formData.buyOrSell,
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      tradeOpenDate: tradeOpenDate,
      expiryDate: expiryDate,
      closeDate: closeDate,
    };

    return calculateProfitLoss(tempTransaction, formData.exitPrice);
  };

  const calculateDaysHeldValue = () => {
    const openDate = new Date(formData.tradeOpenDate);
    const closeDate = formData.status === 'Closed' && formData.closeDate
      ? new Date(formData.closeDate)
      : undefined;

    return calculateDaysHeld(openDate, closeDate);
  };

  const isFormValid = useMemo(() => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.stockSymbol) newErrors.stockSymbol = 'Stock symbol is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    if (formData.strikePrice <= 0) newErrors.strikePrice = 'Strike price must be greater than 0';
    if (formData.premium <= 0) newErrors.premium = 'Premium must be greater than 0';
    if (formData.numberOfContracts <= 0) newErrors.numberOfContracts = 'Number of contracts must be greater than 0';

    // If closing the trade, require exit price and close date
    if (formData.status === 'Closed') {
      if (!formData.exitPrice || formData.exitPrice <= 0) {
        newErrors.exitPrice = 'Exit price is required when closing trade';
      }
      if (!formData.closeDate) {
        newErrors.closeDate = 'Close date is required when closing trade';
      }
      if (formData.closeDate && new Date(formData.closeDate) < new Date(formData.tradeOpenDate)) {
        newErrors.closeDate = 'Close date cannot be before open date';
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAndSetErrors()) {
      return;
    }

    const breakEvenPrice = calculateBreakEvenPrice();
    const profitLoss = formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss();

    const updates: Partial<OptionsTransaction> = {
      portfolioId: formData.portfolioId,
      stockSymbol: formData.stockSymbol,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      expiryDate: new Date(formData.expiryDate),
      callOrPut: formData.callOrPut,
      buyOrSell: formData.buyOrSell,
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      fees: formData.fees,
      status: formData.status,
      breakEvenPrice,
      profitLoss,
      updatedAt: new Date(),
    };

    if (formData.status === 'Closed') {
      updates.exitPrice = formData.exitPrice;
      updates.closeDate = new Date(formData.closeDate);
      // Calculate days held dynamically for annualized ROR
      const daysHeld = Math.max(1, Math.floor((new Date().getTime() - new Date(formData.tradeOpenDate).getTime()) / (1000 * 60 * 60 * 24)));
      updates.annualizedROR = daysHeld > 0 && profitLoss !== 0 ?
        ((profitLoss / (formData.premium * formData.numberOfContracts * 100)) * (365 / daysHeld)) * 100 :
        undefined;
      onSave(transaction.id, updates);
    } else if (formData.status === 'Rolled') {
      handleRollTrade();
    } else {
      updates.exitPrice = undefined;
      updates.closeDate = undefined;
      updates.annualizedROR = undefined;
      onSave(transaction.id, updates);
    }
  };

  const validateAndSetErrors = () => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.stockSymbol) newErrors.stockSymbol = 'Stock symbol is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    if (formData.strikePrice <= 0) newErrors.strikePrice = 'Strike price must be greater than 0';
    if (formData.premium <= 0) newErrors.premium = 'Premium must be greater than 0';
    if (formData.numberOfContracts <= 0) newErrors.numberOfContracts = 'Number of contracts must be greater than 0';

    // If closing the trade, require exit price and close date
    if (formData.status === 'Closed') {
      if (!formData.exitPrice || formData.exitPrice <= 0) {
        newErrors.exitPrice = 'Exit price is required when closing trade';
      }
      if (!formData.closeDate) {
        newErrors.closeDate = 'Close date is required when closing trade';
      }
      if (formData.closeDate && new Date(formData.closeDate) < new Date(formData.tradeOpenDate)) {
        newErrors.closeDate = 'Close date cannot be before open date';
      }
    }

    // If rolling the trade, require all roll fields
    if (formData.status === 'Rolled') {
      if (!formData.newExpiryDate) {
        newErrors.newExpiryDate = 'New expiry date is required when rolling trade';
      }
      if (formData.newStrikePrice <= 0) {
        newErrors.newStrikePrice = 'New strike price must be greater than 0';
      }
      if (formData.newPremium <= 0) {
        newErrors.newPremium = 'New premium must be greater than 0';
      }
      if (formData.exitPremium <= 0) {
        newErrors.exitPremium = 'Exit premium is required when rolling trade';
      }
      if (formData.newExpiryDate && new Date(formData.newExpiryDate) <= new Date(formData.expiryDate)) {
        newErrors.newExpiryDate = 'New expiry date should be after current expiry date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate fees based on number of contracts (0.66 per contract)
      if (field === 'numberOfContracts') {
        const contracts = typeof value === 'number' ? value : parseInt(value as string) || 1;
        newData.fees = contracts * 0.66;
        newData.rollFees = contracts * 0.66; // Also update roll fees
      }

      return newData;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStatusChange = (newStatus: 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled') => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      // Clear exit data when opening trade
      ...(newStatus === 'Open' && { exitPrice: 0, closeDate: '' })
    }));
  };

  const handleRollTrade = async () => {
    try {
      let chain;

      // Check if this trade is already part of a chain
      if (transaction.chainId) {
        // Use existing chain
        const existingChainResponse = await fetch(`/api/trade-chains/${transaction.chainId}`);
        if (existingChainResponse.ok) {
          chain = await existingChainResponse.json();
        } else {
          throw new Error('Failed to fetch existing trade chain');
        }
      } else {
        // Create a new trade chain if this trade isn't already part of one
        const chainData = {
          portfolioId: formData.portfolioId,
          symbol: formData.stockSymbol,
          optionType: formData.callOrPut,
          originalStrikePrice: formData.strikePrice,
          originalOpenDate: formData.tradeOpenDate,
          chainStatus: 'Active',
          totalChainPnl: 0
        };

        // Create chain via API
        const chainResponse = await fetch('/api/trade-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chainData)
        });

        if (!chainResponse.ok) {
          throw new Error('Failed to create trade chain');
        }

        chain = await chainResponse.json();
      }

      // Calculate P&L for the rolled trade (closing the original position)
      // P&L = (Original Premium - Exit Premium) for closing the position
      let rolledProfitLoss = 0;
      if (formData.buyOrSell === 'Sell') {
        // Sold originally (received premium), buying back at exit premium
        rolledProfitLoss = (formData.premium - formData.exitPremium) * formData.numberOfContracts * 100;
      } else {
        // Bought originally (paid premium), selling at exit premium
        rolledProfitLoss = (formData.exitPremium - formData.premium) * formData.numberOfContracts * 100;
      }

      // Only subtract the original transaction fees (roll fees go to the new trade)
      rolledProfitLoss -= formData.fees;


      // Update current trade to "Rolled" status and link to chain
      const rolledTradeUpdates = {
        status: 'Rolled' as const,
        chainId: chain.id,
        exitPrice: formData.exitPremium,
        closeDate: new Date(),
        profitLoss: rolledProfitLoss,
      };

      // Calculate required fields for the new trade
      const newExpiryDate = new Date(formData.newExpiryDate);

      // Calculate break-even price based on option type
      const breakEvenPrice = formData.callOrPut === 'Call'
        ? formData.newStrikePrice + formData.newPremium
        : formData.newStrikePrice - formData.newPremium;

        // Calculate profit/loss for the new trade based on premium and fees
        let newProfitLoss = 0;
        if (formData.buyOrSell === 'Buy') {
          // If you bought the option, you paid the premium (negative P&L until closed)
          newProfitLoss = -formData.newPremium * formData.numberOfContracts * 100;
        } else {
          // If you sold the option, you received the premium (positive P&L until closed)
          newProfitLoss = formData.newPremium * formData.numberOfContracts * 100;
        }

        // Subtract roll fees from the new trade P&L
        newProfitLoss -= parseFloat(String(formData.rollFees || '0'));

        // Create new open trade with updated terms
        const newTradeData = {
          portfolioId: formData.portfolioId,
          stockSymbol: formData.stockSymbol,
          tradeOpenDate: new Date(),
          expiryDate: newExpiryDate,
          callOrPut: formData.callOrPut,
          buyOrSell: formData.buyOrSell,
          strikePrice: formData.newStrikePrice,
          premium: formData.newPremium,
          numberOfContracts: formData.numberOfContracts,
          fees: formData.rollFees,
          status: 'Open' as const,
          chainId: chain.id,
          breakEvenPrice: breakEvenPrice,
          profitLoss: newProfitLoss, // Calculate P&L based on premium
          stockPriceCurrent: 0, // Default value since we removed from UI
          annualizedROR: undefined // No ROR for new trades
        };


      // 1. Update current trade to "Rolled" status
      onSave(transaction.id, rolledTradeUpdates);

      // 2. Create the new open trade via API
      const newTradeResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTradeData)
      });

      if (!newTradeResponse.ok) {
        throw new Error('Failed to create new open trade');
      }

      // Close modal
      onClose();

      // Show success message
      alert('Trade rolled successfully! New open position created.');

    } catch (error) {
      console.error('Error rolling trade:', error);
      alert('Failed to roll trade. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Trade"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
            {/* Portfolio - Full Width */}
            {portfolios.length > 0 && (
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
                {errors.portfolioId && <p className="text-sm text-destructive">{errors.portfolioId}</p>}
              </div>
            )}

            {/* Stock Symbol and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockSymbol">Stock Symbol</Label>
                <Input
                  id="stockSymbol"
                  type="text"
                  value={formData.stockSymbol}
                  onChange={(e) => handleChange('stockSymbol', e.target.value.toUpperCase())}
                  className={errors.stockSymbol ? 'border-destructive w-full' : 'w-full'}
                  placeholder="AAPL"
                />
                {errors.stockSymbol && <p className="text-sm text-destructive">{errors.stockSymbol}</p>}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleStatusChange(value as 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Rolled">Rolled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type and Action */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tradeOpenDate">Open Date</Label>
                <Input
                  id="tradeOpenDate"
                  type="date"
                  value={formData.tradeOpenDate}
                  onChange={(e) => handleChange('tradeOpenDate', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={errors.expiryDate ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.expiryDate && <p className="text-sm text-destructive">{errors.expiryDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strikePrice">Strike Price</Label>
                <Input
                  id="strikePrice"
                  type="number"
                  step="0.01"
                  value={formData.strikePrice}
                  onChange={(e) => handleChange('strikePrice', parseFloat(e.target.value) || 0)}
                  className={errors.strikePrice ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.strikePrice && <p className="text-sm text-destructive">{errors.strikePrice}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="premium">Premium</Label>
                <Input
                  id="premium"
                  type="number"
                  step="0.01"
                  value={formData.premium}
                  onChange={(e) => handleChange('premium', parseFloat(e.target.value) || 0)}
                  className={errors.premium ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.premium && <p className="text-sm text-destructive">{errors.premium}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfContracts">Contracts</Label>
                <Input
                  id="numberOfContracts"
                  type="number"
                  value={formData.numberOfContracts}
                  onChange={(e) => handleChange('numberOfContracts', parseInt(e.target.value) || 1)}
                  className={errors.numberOfContracts ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.numberOfContracts && <p className="text-sm text-destructive">{errors.numberOfContracts}</p>}
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

            {/* Exit Information - Only show when closing trade */}
            {formData.status === 'Closed' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="text-sm font-medium text-red-800 mb-3">Exit Information (Required for Closed Trades)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exitPrice">Exit Price</Label>
                    <Input
                      id="exitPrice"
                      type="number"
                      step="0.01"
                      value={formData.exitPrice}
                      onChange={(e) => handleChange('exitPrice', parseFloat(e.target.value) || 0)}
                      className={errors.exitPrice ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.exitPrice && <p className="text-sm text-destructive">{errors.exitPrice}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closeDate">Close Date</Label>
                    <Input
                      id="closeDate"
                      type="date"
                      value={formData.closeDate}
                      onChange={(e) => handleChange('closeDate', e.target.value)}
                      className={errors.closeDate ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.closeDate && <p className="text-sm text-destructive">{errors.closeDate}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Roll Information - Only show when rolling trade */}
            {formData.status === 'Rolled' && (
              <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800/30">
                <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">Roll Information (Required for Rolled Trades)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exitPremium">Exit Premium (Close Original)</Label>
                    <Input
                      id="exitPremium"
                      type="number"
                      step="0.01"
                      value={formData.exitPremium}
                      onChange={(e) => handleChange('exitPremium', parseFloat(e.target.value) || 0)}
                      className={errors.exitPremium ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.exitPremium && <p className="text-sm text-destructive">{errors.exitPremium}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newExpiryDate">New Expiry Date</Label>
                    <Input
                      id="newExpiryDate"
                      type="date"
                      value={formData.newExpiryDate}
                      onChange={(e) => handleChange('newExpiryDate', e.target.value)}
                      className={errors.newExpiryDate ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.newExpiryDate && <p className="text-sm text-destructive">{errors.newExpiryDate}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newStrikePrice">New Strike Price</Label>
                    <Input
                      id="newStrikePrice"
                      type="number"
                      step="0.01"
                      value={formData.newStrikePrice}
                      onChange={(e) => handleChange('newStrikePrice', parseFloat(e.target.value) || 0)}
                      className={errors.newStrikePrice ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.newStrikePrice && <p className="text-sm text-destructive">{errors.newStrikePrice}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPremium">New Premium (Open New)</Label>
                    <Input
                      id="newPremium"
                      type="number"
                      step="0.01"
                      value={formData.newPremium}
                      onChange={(e) => handleChange('newPremium', parseFloat(e.target.value) || 0)}
                      className={errors.newPremium ? 'border-destructive w-full' : 'w-full'}
                    />
                    {errors.newPremium && <p className="text-sm text-destructive">{errors.newPremium}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rollFees">Roll Fees</Label>
                    <Input
                      id="rollFees"
                      type="number"
                      step="0.01"
                      value={formData.rollFees}
                      onChange={(e) => handleChange('rollFees', parseFloat(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Net Credit/Debit:</span>
                      <div className="text-lg font-medium">
                        {parseFloat(String(formData.exitPremium || '0')) > 0 && parseFloat(String(formData.newPremium || '0')) > 0 ? (
                          (() => {
                            // Net Credit/Debit = (New Premium - Exit Premium) * Contracts * 100 - Roll Fees
                            // Note: Original transaction fees are handled in individual P&L calculations
                            const netAmount = (parseFloat(String(formData.newPremium || '0')) - parseFloat(String(formData.exitPremium || '0'))) * formData.numberOfContracts * 100 - parseFloat(String(formData.rollFees || '0'));
                            return (
                              <span className={netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ${Math.abs(netAmount).toFixed(2)}
                                <span className="text-xs ml-1">
                                  {netAmount >= 0 ? '(Credit)' : '(Debit)'}
                                </span>
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">Enter premiums</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Fields */}
            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-medium text-card-foreground mb-2">Calculated Fields</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-card-foreground">
                <div>
                  <span className="text-muted-foreground">Days to Expiry:</span>
                  <span className="ml-2 font-medium">
                    {formData.expiryDate ? calculateDaysToExpiry(formData.expiryDate) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Break Even:</span>
                  <span className="ml-2 font-medium">
                    ${calculateBreakEvenPrice().toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Held:</span>
                  <span className="ml-2 font-medium">
                    {calculateDaysHeldValue()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {formData.status === 'Closed' ? 'Final P&L:' : 'Current P&L:'}
                  </span>
                  <span className={`ml-2 font-medium ${
                    (formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss()) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.status === 'Closed'
                      ? (formData.exitPrice > 0 ? `$${calculateFinalProfitLoss().toFixed(2)}` : 'Enter exit price')
                      : formData.status === 'Rolled'
                      ? (parseFloat(String(formData.exitPremium || '0')) > 0 && parseFloat(String(formData.newPremium || '0')) > 0 ? `$${calculateCurrentProfitLoss().toFixed(2)}` : 'Enter roll details')
                      : `$${calculateCurrentProfitLoss().toFixed(2)}`
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid}
              >
                Save Changes
              </Button>
            </div>
          </form>
    </Modal>
  );
}
