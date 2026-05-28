'use client';

import { useState, useMemo, useEffect } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import { calculateProfitLoss, calculateDaysHeld, calculateAvailableShares } from '@/utils/optionsCalculations';
import { dateToLocalString, dateToInputString, parseLocalDate } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import { logger } from "@/lib/logger";
import { Loader2, Check, XCircle } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: OptionsTransaction;
  onClose: () => void;
  onSave: (id: string, updates: Partial<OptionsTransaction>) => void | Promise<void>;
  portfolios?: Portfolio[];
  transactions?: OptionsTransaction[];
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

export default function EditTransactionModal({ transaction, onClose, onSave, portfolios = [], transactions = [], onRollTrade }: EditTransactionModalProps) {
  // Ensure dates are Date objects
  const tradeOpenDate = transaction.tradeOpenDate instanceof Date
    ? transaction.tradeOpenDate
    : parseLocalDate(transaction.tradeOpenDate);
  const expiryDate = transaction.expiryDate
    ? (transaction.expiryDate instanceof Date ? transaction.expiryDate : parseLocalDate(transaction.expiryDate))
    : undefined;
  const closeDate = transaction.closeDate
    ? (transaction.closeDate instanceof Date ? transaction.closeDate : parseLocalDate(transaction.closeDate))
    : undefined;

  const [formData, setFormData] = useState({
    portfolioId: transaction.portfolioId || '',
    stockSymbol: transaction.stockSymbol,
    tradeOpenDate: dateToInputString(tradeOpenDate),
    expiryDate: expiryDate ? dateToInputString(expiryDate) : '',
    callOrPut: transaction.callOrPut || 'Call',
    buyOrSell: transaction.buyOrSell,
    strikePrice: transaction.strikePrice || 0,
    premium: transaction.premium || 0,
    numberOfContracts: transaction.numberOfContracts || 1,
    fees: transaction.fees || 0,
    status: transaction.status,
    exitPrice: transaction.exitPrice || 0,
    closeDate: closeDate ? dateToInputString(closeDate) : '',
    collateralAmount: transaction.collateralAmount || 0,
    // Roll fields
    newExpiryDate: '',
    newStrikePrice: transaction.strikePrice || 0,
    newPremium: 0,
    exitPremium: 0,
    rollFees: (transaction.numberOfContracts || 1) * 0.66, // Roll fee per contract

    // Stock lot & coverage fields
    transactionType: transaction.transactionType || 'option',
    sharesQuantity: transaction.sharesQuantity || 100,
    sharePrice: transaction.sharePrice || 0,
    coveredByType: transaction.coveredByType || 'none',
    coveredById: transaction.coveredById || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`;
  };

  const calculateDaysToExpiry = (expiryDateStr: string) => {
    const today = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBreakEvenPrice = () => {
    if (formData.transactionType === 'stock') {
      return formData.sharePrice;
    }
    if (formData.callOrPut === 'Call') {
      return formData.strikePrice + formData.premium;
    } else {
      return formData.strikePrice - formData.premium;
    }
  };

  const calculateCurrentProfitLoss = () => {
    // Construct a temporary transaction to pass to pure logic
    const tempTransaction: OptionsTransaction = {
      ...transaction,
      stockSymbol: formData.stockSymbol,
      portfolioId: formData.portfolioId,
      buyOrSell: formData.buyOrSell,
      status: formData.status,
      fees: formData.fees,
      transactionType: formData.transactionType,
      sharesQuantity: formData.sharesQuantity,
      sharePrice: formData.sharePrice,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
      callOrPut: formData.callOrPut as 'Call' | 'Put',
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      exitPrice: undefined,
      closeDate: undefined,
    };

    if (formData.status === 'Rolled') {
      return calculateRolledDisplayProfitLoss();
    }

    return calculateProfitLoss(tempTransaction);
  };

  const calculateRolledDisplayProfitLoss = () => {
    const exitPremium = parseFloat(String(formData.exitPremium || '0')) || 0;
    if (exitPremium <= 0) {
      return 0;
    }

    let profitLoss = 0;
    if (formData.buyOrSell === 'Sell') {
      profitLoss = (formData.premium - exitPremium) * formData.numberOfContracts * 100;
    } else {
      profitLoss = (exitPremium - formData.premium) * formData.numberOfContracts * 100;
    }

    profitLoss -= formData.fees;
    return profitLoss;
  };

  const calculateFinalProfitLoss = () => {
    const tempTransaction: OptionsTransaction = {
      ...transaction,
      stockSymbol: formData.stockSymbol,
      portfolioId: formData.portfolioId,
      buyOrSell: formData.buyOrSell,
      status: formData.status,
      fees: formData.fees,
      transactionType: formData.transactionType,
      sharesQuantity: formData.sharesQuantity,
      sharePrice: formData.sharePrice,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
      callOrPut: formData.callOrPut as 'Call' | 'Put',
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
    };

    return calculateProfitLoss(tempTransaction, formData.exitPrice);
  };

  const calculateDaysHeldValue = () => {
    const openDate = new Date(formData.tradeOpenDate);
    const closeDateObj = ['Closed', 'Expired', 'Assigned', 'Rolled'].includes(formData.status) && formData.closeDate
      ? new Date(formData.closeDate)
      : undefined;

    return calculateDaysHeld(openDate, closeDateObj);
  };

  // Fetch available shares and open long calls for the current symbol and portfolio
  const availableSharesInfo = useMemo(() => {
    if (formData.transactionType !== 'option' || !formData.stockSymbol) {
      return { totalShares: 0, committedShares: 0, availableShares: 0, avgPrice: 0 };
    }
    // Filter out current transaction to avoid self-commitment counting
    const portfolioTxns = (transactions || []).filter(t => t.portfolioId === formData.portfolioId && t.id !== transaction.id);
    return calculateAvailableShares(portfolioTxns, formData.stockSymbol);
  }, [transactions, formData.portfolioId, formData.stockSymbol, formData.transactionType, transaction.id]);

  const openLongCalls = useMemo(() => {
    if (formData.transactionType !== 'option' || !formData.stockSymbol) return [];
    return (transactions || []).filter(t =>
      t.portfolioId === formData.portfolioId &&
      t.stockSymbol === formData.stockSymbol &&
      t.transactionType === 'option' &&
      t.buyOrSell === 'Buy' &&
      t.callOrPut === 'Call' &&
      t.status === 'Open' &&
      t.id !== transaction.id
    );
  }, [transactions, formData.portfolioId, formData.stockSymbol, formData.transactionType, transaction.id]);

  const validateAndSetErrors = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.stockSymbol) newErrors.stockSymbol = 'Stock symbol is required';

    if (formData.transactionType === 'stock') {
      if (formData.sharesQuantity <= 0) newErrors.sharesQuantity = 'Quantity must be greater than 0';
      if (formData.sharePrice <= 0) newErrors.sharePrice = 'Share price must be greater than 0';

      // Validation for open covered calls: check if reducing/closing/selling this stock lot violates coverage requirement
      const portfolioTxns = (transactions || []).filter(t => t.portfolioId === formData.portfolioId && t.id !== transaction.id);
      
      const otherOpenShares = portfolioTxns
        .filter(t => t.stockSymbol === formData.stockSymbol && t.transactionType === 'stock' && t.buyOrSell === 'Buy' && t.status === 'Open')
        .reduce((sum, t) => sum + (t.sharesQuantity || 0), 0);

      const proposedLotShares = (formData.buyOrSell === 'Buy' && formData.status === 'Open') ? formData.sharesQuantity : 0;
      const proposedTotalShares = otherOpenShares + proposedLotShares;

      const openShortCalls = portfolioTxns.filter(t =>
        t.stockSymbol === formData.stockSymbol &&
        t.transactionType === 'option' &&
        t.buyOrSell === 'Sell' &&
        t.callOrPut === 'Call' &&
        t.status === 'Open' &&
        t.coveredByType === 'stock'
      );
      const committedShares = openShortCalls.reduce((sum, t) => sum + ((t.numberOfContracts || 0) * 100), 0);

      if (proposedTotalShares < committedShares) {
        newErrors.sharesQuantity = `Cannot reduce/close stock. Open covered calls require at least ${committedShares} shares, but this change would leave only ${proposedTotalShares} shares.`;
        if (formData.buyOrSell === 'Sell') {
          newErrors.buyOrSell = `Cannot sell stock position. Open covered calls require at least ${committedShares} shares.`;
        }
        if (formData.status === 'Closed') {
          newErrors.status = `Cannot close/sell stock position. Open covered calls require at least ${committedShares} shares.`;
        }
      }

      if (formData.status === 'Closed') {
        if (!formData.exitPrice || formData.exitPrice <= 0) {
          newErrors.exitPrice = 'Exit price is required when closing stock';
        }
        if (!formData.closeDate) {
          newErrors.closeDate = 'Close date is required';
        }
        if (formData.closeDate && new Date(formData.closeDate) < new Date(formData.tradeOpenDate)) {
          newErrors.closeDate = 'Close date cannot be before open date';
        }
      }
    } else {
      // Option validation
      if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
      if (formData.strikePrice <= 0) newErrors.strikePrice = 'Strike price must be greater than 0';
      if (formData.premium <= 0) newErrors.premium = 'Premium must be greater than 0';
      if (formData.numberOfContracts <= 0) newErrors.numberOfContracts = 'Number of contracts must be greater than 0';

      if (['Closed', 'Expired', 'Assigned'].includes(formData.status)) {
        if (formData.status === 'Closed' && (!formData.exitPrice || formData.exitPrice < 0)) {
          newErrors.exitPrice = 'Exit price is required when closing option';
        }
        if (!formData.closeDate) {
          newErrors.closeDate = 'Close date is required';
        }
        if (formData.closeDate && new Date(formData.closeDate) < new Date(formData.tradeOpenDate)) {
          newErrors.closeDate = 'Close date cannot be before open date';
        }
      }

      // Sell Call Coverage linkage checks
      if (formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && formData.status === 'Open') {
        if (formData.coveredByType === 'none') {
          newErrors.coveredByType = 'Covered calls must be covered by stock or a long option. Naked selling is disabled.';
        } else if (formData.coveredByType === 'stock') {
          const reqShares = formData.numberOfContracts * 100;
          if (availableSharesInfo.availableShares < reqShares) {
            newErrors.coveredByType = `Insufficient available stock. You have ${availableSharesInfo.availableShares} shares, but need ${reqShares} shares.`;
          }
        } else if (formData.coveredByType === 'option') {
          if (!formData.coveredById) {
            newErrors.coveredById = 'You must select a covering long call option.';
          } else {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = useMemo(() => {
    // Run quick checks for disabled state of submit button
    if (!formData.stockSymbol) return false;
    if (formData.transactionType === 'stock') {
      if (formData.sharesQuantity <= 0 || formData.sharePrice <= 0) return false;
      if (formData.status === 'Closed' && (!formData.exitPrice || !formData.closeDate)) return false;
    } else {
      if (!formData.expiryDate || formData.strikePrice <= 0 || formData.premium <= 0 || formData.numberOfContracts <= 0) return false;
      if (['Closed', 'Expired', 'Assigned'].includes(formData.status) && !formData.closeDate) return false;
      if (formData.status === 'Closed' && formData.exitPrice < 0) return false;
      if (formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && formData.status === 'Open') {
        if (formData.coveredByType === 'none') return false;
        if (formData.coveredByType === 'stock' && availableSharesInfo.availableShares < formData.numberOfContracts * 100) return false;
        if (formData.coveredByType === 'option' && !formData.coveredById) return false;
      }
      if (formData.status === 'Rolled' && (!formData.newExpiryDate || formData.newStrikePrice <= 0 || formData.newPremium <= 0 || formData.exitPremium <= 0)) return false;
    }
    return true;
  }, [formData, availableSharesInfo.availableShares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAndSetErrors()) {
      return;
    }

    const breakEvenPrice = calculateBreakEvenPrice();
    const profitLoss = ['Closed', 'Expired', 'Assigned'].includes(formData.status) ? calculateFinalProfitLoss() : calculateCurrentProfitLoss();

    const updates: Partial<OptionsTransaction> = {
      portfolioId: formData.portfolioId,
      stockSymbol: formData.stockSymbol,
      tradeOpenDate: parseLocalDate(formData.tradeOpenDate),
      status: formData.status,
      fees: formData.fees,
      transactionType: formData.transactionType,
      buyOrSell: formData.buyOrSell,
      breakEvenPrice,
      profitLoss,
      updatedAt: new Date(),

      ...(formData.transactionType === 'stock' ? {
        sharesQuantity: formData.sharesQuantity,
        sharePrice: formData.sharePrice,
        expiryDate: undefined,
        callOrPut: undefined,
        strikePrice: undefined,
        premium: undefined,
        numberOfContracts: undefined,
        coveredByType: undefined,
        coveredById: undefined,
        exitPrice: formData.status === 'Closed' ? formData.exitPrice : undefined,
        closeDate: formData.status === 'Closed' ? parseLocalDate(formData.closeDate) : undefined,
      } : {
        expiryDate: parseLocalDate(formData.expiryDate),
        callOrPut: formData.callOrPut as 'Call' | 'Put',
        strikePrice: formData.strikePrice,
        premium: formData.premium,
        numberOfContracts: formData.numberOfContracts,
        collateralAmount: formData.collateralAmount || undefined,
        coveredByType: formData.coveredByType as 'stock' | 'option' | 'none',
        coveredById: formData.coveredByType === 'option' ? formData.coveredById : undefined,
        exitPrice: ['Closed', 'Expired', 'Assigned'].includes(formData.status) ? formData.exitPrice : undefined,
        closeDate: ['Closed', 'Expired', 'Assigned'].includes(formData.status) ? parseLocalDate(formData.closeDate) : undefined,
      })
    };

    setSubmitStatus('loading');
    setApiError(null);
    try {
      if (formData.status === 'Closed' || formData.status === 'Assigned' || formData.status === 'Expired') {
        const daysHeld = Math.max(1, Math.floor((new Date(formData.closeDate).getTime() - new Date(formData.tradeOpenDate).getTime()) / (1000 * 60 * 60 * 24)));
        
        if (formData.transactionType === 'option') {
          updates.annualizedROR = daysHeld > 0 && profitLoss !== 0 ?
            ((profitLoss / (formData.premium * formData.numberOfContracts * 100)) * (365 / daysHeld)) * 100 :
            undefined;
        } else {
          updates.annualizedROR = daysHeld > 0 && profitLoss !== 0 ?
            ((profitLoss / (formData.sharePrice * formData.sharesQuantity)) * (365 / daysHeld)) * 100 :
            undefined;
        }
        await onSave(transaction.id, updates);
      } else if (formData.status === 'Rolled') {
        await handleRollTrade();
        return; 
      } else {
        updates.exitPrice = undefined;
        updates.closeDate = undefined;
        updates.annualizedROR = undefined;
        await onSave(transaction.id, updates);
      }
      
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setSubmitStatus('error');
      setApiError(error instanceof Error ? error.message : 'Failed to save transaction');
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'numberOfContracts') {
        const contracts = typeof value === 'number' ? value : parseInt(value as string) || 1;
        newData.fees = contracts * 0.66;
        newData.rollFees = contracts * 0.66;
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
        updates.exitPrice = 0;
        updates.closeDate = dateToInputString(new Date());
      } else if (newStatus === 'Closed') {
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
        callOrPut: formData.callOrPut as 'Call' | 'Put',
        buyOrSell: formData.buyOrSell,
        strikePrice: formData.newStrikePrice,
        premium: formData.newPremium,
        numberOfContracts: formData.numberOfContracts,
        fees: formData.rollFees,
        status: 'Open' as const,
        breakEvenPrice,
        profitLoss: newProfitLoss,
        stockPriceCurrent: 0,
        annualizedROR: undefined,
        transactionType: 'option' as const,
        coveredByType: formData.coveredByType as 'stock' | 'option' | 'none',
        coveredById: formData.coveredByType === 'option' ? formData.coveredById : undefined,
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

      const rolledTradeUpdates = { ...originalUpdates, chainId: chain.id };
      const newTradeData = { ...newTradeBase, chainId: chain.id };

      await onSave(transaction.id, rolledTradeUpdates);

      const newTradeResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTradeData)
      });
      if (!newTradeResponse.ok) throw new Error('Failed to create new open trade');

      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (error) {
      logger.error({ error }, 'Error rolling trade:');
      setSubmitStatus('error');
      setApiError(error instanceof Error ? error.message : 'Failed to roll trade');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Edit ${formData.transactionType === 'stock' ? 'Stock' : 'Option'} Trade`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-start gap-2 border border-destructive/20 animate-in fade-in slide-in-from-top-1">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Portfolio */}
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
            <Label className={errors.status ? 'text-destructive font-medium' : ''}>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleStatusChange(value as 'Open' | 'Closed' | 'Expired' | 'Assigned' | 'Rolled')}
            >
              <SelectTrigger className={errors.status ? 'border-destructive w-full' : 'w-full'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                {formData.transactionType === 'option' && <SelectItem value="Expired">Expired</SelectItem>}
                {formData.transactionType === 'option' && <SelectItem value="Assigned">Assigned</SelectItem>}
                {formData.transactionType === 'option' && <SelectItem value="Rolled">Rolled</SelectItem>}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive mt-1">{errors.status}</p>}
          </div>
        </div>

        {/* Option specific fields */}
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
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={errors.expiryDate ? 'border-destructive w-full appearance-none min-h-[2.5rem]' : 'w-full appearance-none min-h-[2.5rem]'}
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

            {/* Coverage Selection - Required for Short Calls */}
            {formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && formData.status === 'Open' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md space-y-3 border border-blue-200 dark:border-blue-900">
                <div className="space-y-2">
                  <Label htmlFor="coveredByType" className={errors.coveredByType ? 'text-destructive font-medium' : ''}>
                    Coverage Type {transaction.coveredByType === undefined && <span className="text-amber-600 dark:text-amber-400 font-semibold">(Migration Needed)</span>}
                  </Label>
                  <Select value={formData.coveredByType} onValueChange={(value) => handleChange('coveredByType', value)}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select coverage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Covered by Stock Position</SelectItem>
                      <SelectItem value="option">Covered by Long Call (PMCC)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.coveredByType && <p className="text-xs text-destructive mt-1">{errors.coveredByType}</p>}
                </div>

                {formData.coveredByType === 'stock' && (
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p>Available Shares: <span className="font-semibold">{availableSharesInfo.availableShares}</span></p>
                    <p>Required Shares: <span className="font-semibold">{formData.numberOfContracts * 100}</span> (100 shares per contract)</p>
                  </div>
                )}

                {formData.coveredByType === 'option' && (
                  <div className="space-y-2">
                    <Label htmlFor="coveredById" className={errors.coveredById ? 'text-destructive font-medium' : ''}>Select Covering Long Call</Label>
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
                )}
              </div>
            )}

            {/* Collateral Override Amount */}
            {formData.buyOrSell === 'Sell' && formData.callOrPut === 'Call' && (
              <div className="space-y-2">
                <Label htmlFor="collateralAmount">
                  Collateral Override ($)
                  <span className="text-sm text-muted-foreground ml-2">(Optional)</span>
                </Label>
                <Input
                  id="collateralAmount"
                  type="number"
                  step="0.01"
                  value={formData.collateralAmount || ''}
                  onChange={(e) => handleChange('collateralAmount', parseFloat(e.target.value) || 0)}
                  className="w-full"
                  placeholder="Enter actual collateral deployed"
                />
              </div>
            )}
          </>
        )}

        {/* Stock specific fields */}
        {formData.transactionType === 'stock' && (
          <>
            {/* Action and Open Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyOrSell" className={errors.buyOrSell ? 'text-destructive font-medium' : ''}>Action</Label>
                <Select value={formData.buyOrSell} onValueChange={(value) => handleChange('buyOrSell', value)}>
                  <SelectTrigger className={errors.buyOrSell ? 'border-destructive w-full' : 'w-full'}>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
                {errors.buyOrSell && <p className="text-xs text-destructive mt-1">{errors.buyOrSell}</p>}
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
                  value={formData.sharesQuantity}
                  onChange={(e) => handleChange('sharesQuantity', parseInt(e.target.value) || 0)}
                  className={errors.sharesQuantity ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.sharesQuantity && <p className="text-sm text-destructive">{errors.sharesQuantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sharePrice" className={errors.sharePrice ? 'text-destructive' : ''}>
                  Share Purchase Price
                </Label>
                <Input
                  id="sharePrice"
                  type="number"
                  step="0.01"
                  value={formData.sharePrice}
                  onChange={(e) => handleChange('sharePrice', parseFloat(e.target.value) || 0)}
                  className={errors.sharePrice ? 'border-destructive w-full' : 'w-full'}
                />
                {errors.sharePrice && <p className="text-sm text-destructive">{errors.sharePrice}</p>}
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

        {/* Exit details for closed status */}
        {(formData.status === 'Closed' || formData.status === 'Assigned' || formData.status === 'Expired') && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-850">
            <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">
              Exit/Close Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exitPrice" className={errors.exitPrice ? 'text-destructive' : ''}>Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.01"
                  value={formData.exitPrice}
                  onChange={(e) => handleChange('exitPrice', parseFloat(e.target.value) || 0)}
                  className={errors.exitPrice ? 'border-destructive w-full bg-background' : 'w-full bg-background'}
                  disabled={formData.status !== 'Closed'} 
                />
                {errors.exitPrice && <p className="text-sm text-destructive">{errors.exitPrice}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="closeDate" className={errors.closeDate ? 'text-destructive' : ''}>Close Date</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => handleChange('closeDate', e.target.value)}
                  className={errors.closeDate ? 'border-destructive w-full appearance-none min-h-[2.5rem] bg-background' : 'w-full appearance-none min-h-[2.5rem] bg-background'}
                />
                {errors.closeDate && <p className="text-sm text-destructive">{errors.closeDate}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Roll details */}
        {formData.status === 'Rolled' && formData.transactionType === 'option' && (
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800/30">
            <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">Roll Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exitPremium">Exit Premium (Close Original)</Label>
                <Input
                  id="exitPremium"
                  type="number"
                  step="0.01"
                  value={formData.exitPremium}
                  onChange={(e) => handleChange('exitPremium', parseFloat(e.target.value) || 0)}
                  className={errors.exitPremium ? 'border-destructive w-full bg-background' : 'w-full bg-background'}
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
                  className={errors.newExpiryDate ? 'border-destructive w-full appearance-none min-h-[2.5rem] bg-background' : 'w-full appearance-none min-h-[2.5rem] bg-background'}
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
                  className={errors.newStrikePrice ? 'border-destructive w-full bg-background' : 'w-full bg-background'}
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
                  className={errors.newPremium ? 'border-destructive w-full bg-background' : 'w-full bg-background'}
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
                  className="w-full bg-background"
                />
              </div>

              <div className="flex items-center">
                <div>
                  <span className="text-sm text-muted-foreground">Net Credit/Debit:</span>
                  <div className="text-lg font-medium text-card-foreground">
                    {parseFloat(String(formData.exitPremium || '0')) > 0 && parseFloat(String(formData.newPremium || '0')) > 0 ? (
                      (() => {
                        const exitP = parseFloat(String(formData.exitPremium || '0'));
                        const newP = parseFloat(String(formData.newPremium || '0'));
                        const fees = parseFloat(String(formData.rollFees || '0'));
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
            {formData.transactionType === 'option' && (
              <div>
                <span className="text-muted-foreground">Days to Expiry:</span>
                <span className="ml-2 font-medium">
                  {formData.expiryDate ? calculateDaysToExpiry(formData.expiryDate) : '-'}
                </span>
              </div>
            )}
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
                {['Closed', 'Expired', 'Assigned', 'Rolled'].includes(formData.status) ? 'Final P&L:' : 'Current P&L:'}
              </span>
              <span className={`ml-2 font-medium ${(formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss()) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {['Closed', 'Expired', 'Assigned'].includes(formData.status)
                  ? (formData.status === 'Closed' && formData.exitPrice <= 0 ? 'Enter exit price' : formatCurrency(calculateFinalProfitLoss()))
                  : formData.status === 'Rolled'
                    ? (parseFloat(String(formData.exitPremium || '0')) > 0 && parseFloat(String(formData.newPremium || '0')) > 0 ? formatCurrency(calculateCurrentProfitLoss()) : 'Enter roll details')
                    : formatCurrency(calculateCurrentProfitLoss())
                }
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
            disabled={submitStatus === 'loading' || submitStatus === 'success'}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || submitStatus === 'loading' || submitStatus === 'success'}
            className={submitStatus === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : ''}
          >
            {submitStatus === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {formData.status === 'Rolled' ? 'Rolling...' : 'Saving...'}
              </>
            ) : submitStatus === 'success' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {formData.status === 'Rolled' ? 'Rolled!' : 'Saved!'}
              </>
            ) : (
              formData.status === 'Rolled' ? 'Roll Trade' : 'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
