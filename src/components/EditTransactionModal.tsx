'use client';

import { useState, useMemo } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import { calculateProfitLoss, calculateDaysHeld } from '@/utils/optionsCalculations';
import { dateToLocalString, dateToInputString, parseLocalDate } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import { logger } from "@/lib/logger";

interface EditTransactionModalProps {
  transaction: OptionsTransaction;
  onClose: () => void;
  onSave: (id: string, updates: Partial<OptionsTransaction>) => void;
  portfolios?: Portfolio[];
  /** Optional override for the roll flow. When provided, replaces the internal
   *  hardcoded API calls — used by the demo page to redirect to /api/demo/* */
  onRollTrade?: (rollData: RollTradeData) => Promise<void>;
}

/** Data shape passed to the optional onRollTrade override. */
export interface RollTradeData {
  /** Updates to apply to the *original* transaction (status → Rolled, chainId, exitPrice, …) */
  originalUpdates: Partial<OptionsTransaction>;
  /** The fully-constructed new open trade to create */
  newTrade: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>;
  /** Resolved chain id if the trade was already in a chain; null = must create new chain */
  existingChainId: string | null;
  /** Fields needed to create a new chain when existingChainId is null */
  newChainData: {
    portfolioId: string;
    symbol: string;
    optionType: string;
    originalStrikePrice: number;
    originalOpenDate: string;
    chainStatus: string;
    totalChainPnl: number;
  };
}

export default function EditTransactionModal({ transaction, onClose, onSave, portfolios = [], onRollTrade }: EditTransactionModalProps) {
  // Ensure dates are Date objects
  const tradeOpenDate = transaction.tradeOpenDate instanceof Date
    ? transaction.tradeOpenDate
    : parseLocalDate(transaction.tradeOpenDate);
  const expiryDate = transaction.expiryDate instanceof Date
    ? transaction.expiryDate
    : parseLocalDate(transaction.expiryDate);
  const closeDate = transaction.closeDate
    ? (transaction.closeDate instanceof Date ? transaction.closeDate : parseLocalDate(transaction.closeDate))
    : undefined;

  const [formData, setFormData] = useState({
    portfolioId: transaction.portfolioId || '',
    stockSymbol: transaction.stockSymbol,
    tradeOpenDate: dateToInputString(tradeOpenDate),
    expiryDate: dateToInputString(expiryDate),
    callOrPut: transaction.callOrPut,
    buyOrSell: transaction.buyOrSell,
    strikePrice: transaction.strikePrice,
    premium: transaction.premium,
    numberOfContracts: transaction.numberOfContracts,
    fees: transaction.fees || (transaction.numberOfContracts * 0.66), // Auto-calculate if no fees set
    status: transaction.status,
    exitPrice: transaction.exitPrice || 0,
    closeDate: closeDate ? dateToInputString(closeDate) : '',
    collateralAmount: transaction.collateralAmount || 0, // Manual collateral amount
    // Roll fields
    newExpiryDate: '',
    newStrikePrice: transaction.strikePrice,
    newPremium: 0,
    exitPremium: 0,
    rollFees: transaction.numberOfContracts * 0.66, // Roll fee per contract
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`;
  };

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
      tradeOpenDate: parseLocalDate(formData.tradeOpenDate),
      expiryDate: parseLocalDate(formData.expiryDate),
      callOrPut: formData.callOrPut,
      buyOrSell: formData.buyOrSell,
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      fees: formData.fees,
      status: formData.status,
      collateralAmount: formData.collateralAmount || undefined,
      breakEvenPrice,
      profitLoss,
      updatedAt: new Date(),
    };

    if (formData.status === 'Closed' || formData.status === 'Assigned' || formData.status === 'Expired') {
      updates.exitPrice = formData.exitPrice;
      updates.closeDate = parseLocalDate(formData.closeDate);
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

    // If closing, assigning, or expiring the trade, require exit price and close date
    if (formData.status === 'Closed' || formData.status === 'Assigned' || formData.status === 'Expired') {
      // Exit price is required for Closed, but for Assigned/Expired it typically defaults to 0
      if (formData.status === 'Closed' && (!formData.exitPrice || formData.exitPrice < 0)) {
        newErrors.exitPrice = 'Exit price is required when closing trade';
      }
      if (!formData.closeDate) {
        newErrors.closeDate = 'Close date is required';
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
      if (formData.newExpiryDate && new Date(formData.newExpiryDate) < new Date(formData.expiryDate)) {
        newErrors.newExpiryDate = 'New expiry date cannot be before current expiry date';
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
    setFormData(prev => {
      const updates: any = { status: newStatus };

      if (newStatus === 'Open') {
        updates.exitPrice = 0;
        updates.closeDate = '';
      } else if (newStatus === 'Assigned' || newStatus === 'Expired') {
        // Set exitPrice to 0 and closeDate to today by default
        updates.exitPrice = 0;
        updates.closeDate = dateToInputString(new Date());
      } else if (newStatus === 'Closed') {
        // For Closed, keep current values or set today's date if empty
        updates.closeDate = prev.closeDate || dateToInputString(new Date());
      }

      return {
        ...prev,
        ...updates
      };
    });
  };

  const handleRollTrade = async () => {
    try {
      // --- Shared data preparation (used by both production & demo paths) ---
      let rolledProfitLoss = 0;
      if (formData.buyOrSell === 'Sell') {
        rolledProfitLoss = (formData.premium - formData.exitPremium) * formData.numberOfContracts * 100;
      } else {
        rolledProfitLoss = (formData.exitPremium - formData.premium) * formData.numberOfContracts * 100;
      }
      rolledProfitLoss -= formData.fees;

      const breakEvenPrice = formData.callOrPut === 'Call'
        ? formData.newStrikePrice + formData.newPremium
        : formData.newStrikePrice - formData.newPremium;

      let newProfitLoss = 0;
      if (formData.buyOrSell === 'Buy') {
        newProfitLoss = -formData.newPremium * formData.numberOfContracts * 100;
      } else {
        newProfitLoss = formData.newPremium * formData.numberOfContracts * 100;
      }
      newProfitLoss -= parseFloat(String(formData.rollFees || '0'));

      const originalUpdates = {
        status: 'Rolled' as const,
        exitPrice: formData.exitPremium,
        closeDate: new Date(),
        profitLoss: rolledProfitLoss,
      };

      const newTradeBase = {
        portfolioId: formData.portfolioId,
        stockSymbol: formData.stockSymbol,
        tradeOpenDate: new Date(),
        expiryDate: new Date(formData.newExpiryDate),
        callOrPut: formData.callOrPut,
        buyOrSell: formData.buyOrSell,
        strikePrice: formData.newStrikePrice,
        premium: formData.newPremium,
        numberOfContracts: formData.numberOfContracts,
        fees: formData.rollFees,
        status: 'Open' as const,
        breakEvenPrice,
        profitLoss: newProfitLoss,
        stockPriceCurrent: 0,
        annualizedROR: undefined as undefined,
      };

      const newChainData = {
        portfolioId: formData.portfolioId,
        symbol: formData.stockSymbol,
        optionType: formData.callOrPut,
        originalStrikePrice: formData.strikePrice,
        originalOpenDate: formData.tradeOpenDate,
        chainStatus: 'Active',
        totalChainPnl: 0,
      };

      // --- Delegate to onRollTrade override if provided (e.g. demo mode) ---
      if (onRollTrade) {
        await onRollTrade({
          originalUpdates,
          newTrade: newTradeBase as Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>,
          existingChainId: transaction.chainId ?? null,
          newChainData,
        });
        onClose();
        return;
      }

      // --- Production path: use real /api/* endpoints ---
      let chain;
      if (transaction.chainId) {
        const existingChainResponse = await fetch(`/api/trade-chains/${transaction.chainId}`);
        if (existingChainResponse.ok) {
          chain = await existingChainResponse.json();
        } else {
          throw new Error('Failed to fetch existing trade chain');
        }
      } else {
        const chainResponse = await fetch('/api/trade-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newChainData)
        });
        if (!chainResponse.ok) throw new Error('Failed to create trade chain');
        chain = await chainResponse.json();
      }

      // Apply chain id to both sets of data
      const rolledTradeUpdates = { ...originalUpdates, chainId: chain.id };
      const newTradeData = { ...newTradeBase, chainId: chain.id };

      // 1. Update current trade to "Rolled" status
      onSave(transaction.id, rolledTradeUpdates);

      // 2. Create the new open trade via API
      const newTradeResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTradeData)
      });
      if (!newTradeResponse.ok) throw new Error('Failed to create new open trade');

      onClose();
      alert('Trade rolled successfully! New open position created.');

    } catch (error) {
      logger.error({ error }, 'Error rolling trade:');
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

        {/* Collateral Amount - Only show for covered calls */}
        {formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && (
          <div className="space-y-2">
            <Label htmlFor="collateralAmount">
              Collateral Amount ($)
              <span className="text-sm text-muted-foreground ml-2">
                (Optional - for accurate RoR calculation)
              </span>
            </Label>
            <Input
              id="collateralAmount"
              type="number"
              step="0.01"
              value={formData.collateralAmount || ''}
              onChange={(e) => handleChange('collateralAmount', parseFloat(e.target.value) || 0)}
              className="w-full"
              placeholder="Enter actual collateral deployed (e.g., LEAP cost for PMCC)"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use automatic calculation. For PMCC strategies, enter the cost of your LEAP option.
            </p>
          </div>
        )}

        {/* Exit Information - Only show when closing, assigning, or expiring trade */}
        {(formData.status === 'Closed' || formData.status === 'Assigned' || formData.status === 'Expired') && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">
              {formData.status === 'Closed' ? 'Exit Information (Required for Closed Trades)' :
                formData.status === 'Assigned' ? 'Assignment Details' : 'Expiration Details'}
            </h4>
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
                        const exitP = parseFloat(String(formData.exitPremium || '0'));
                        const newP = parseFloat(String(formData.newPremium || '0'));
                        const fees = parseFloat(String(formData.rollFees || '0'));

                        // For a short roll (originally sold), we Buy to Close (pay exitP) and Sell to Open (receive newP).
                        // For a long roll (originally bought), we Sell to Close (receive exitP) and Buy to Open (pay newP).
                        let netAmount = 0;
                        if (formData.buyOrSell === 'Sell') {
                          netAmount = (newP - exitP) * formData.numberOfContracts * 100 - fees;
                        } else {
                          netAmount = (exitP - newP) * formData.numberOfContracts * 100 - fees;
                        }

                        return (
                          <span className={netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(netAmount)}
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
                {formatCurrency(calculateBreakEvenPrice())}
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
              <span className={`ml-2 font-medium ${(formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss()) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {formData.status === 'Closed'
                  ? (formData.exitPrice > 0 ? formatCurrency(calculateFinalProfitLoss()) : 'Enter exit price')
                  : formData.status === 'Rolled'
                    ? (parseFloat(String(formData.exitPremium || '0')) > 0 && parseFloat(String(formData.newPremium || '0')) > 0 ? formatCurrency(calculateCurrentProfitLoss()) : 'Enter roll details')
                    : formatCurrency(calculateCurrentProfitLoss())
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
