'use client';

import { useState, useEffect } from 'react';
import { OptionsTransaction } from '@/types/options';
import { dateToLocalString, dateToInputString } from '@/utils/dateUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';

interface AddTransactionModalProps {
  onClose: () => void;
  onSave: (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  portfolios?: Array<{ id: string; name: string; isDefault: boolean }>;
  selectedPortfolioId?: string | null;
}

export default function AddTransactionModal({ onClose, onSave, portfolios = [], selectedPortfolioId }: AddTransactionModalProps) {
  const [formData, setFormData] = useState({
    portfolioId: selectedPortfolioId || portfolios.find(p => p.isDefault)?.id || '',
    stockSymbol: '',
    tradeOpenDate: dateToInputString(new Date()),
    expiryDate: '',
    callOrPut: 'Call' as 'Call' | 'Put',
    buyOrSell: 'Buy' as 'Buy' | 'Sell',
    strikePrice: 0,
    premium: 0,
    numberOfContracts: 1,
    fees: 0.66, // Default broker fee (0.66 per contract)
    status: 'Open' as 'Open' | 'Closed' | 'Expired' | 'Assigned',
    stockPriceCurrent: 0, // Default value since we removed from UI
    collateralAmount: 0, // Manual collateral amount for covered calls
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const calculateDaysToExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateBreakEven = () => {
    if (formData.callOrPut === 'Call') {
      return formData.strikePrice + formData.premium;
    } else {
      return formData.strikePrice - formData.premium;
    }
  };

  const calculateProfitLoss = () => {
    // For new trades, show premium received/paid as P&L, minus fees
    const contracts = formData.numberOfContracts;
    const premium = formData.premium;
    const fees = formData.fees;

    let profitLoss = 0;
    if (formData.buyOrSell === 'Buy') {
      // If you bought the option, you paid the premium plus fees (negative P&L until closed)
      profitLoss = -premium * contracts * 100 - fees;
    } else {
      // If you sold the option, you received the premium minus fees (positive P&L until closed)
      profitLoss = premium * contracts * 100 - fees;
    }

    return profitLoss;
  };

  const calculateDaysHeld = () => {
    const openDate = new Date(formData.tradeOpenDate);
    const today = new Date();
    const diffTime = today.getTime() - openDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.stockSymbol) newErrors.stockSymbol = 'Stock symbol is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    if (formData.strikePrice <= 0) newErrors.strikePrice = 'Strike price must be greater than 0';
    if (formData.premium <= 0) newErrors.premium = 'Premium must be greater than 0';
    if (formData.numberOfContracts <= 0) newErrors.numberOfContracts = 'Number of contracts must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const breakEvenPrice = calculateBreakEven();
    const profitLoss = calculateProfitLoss(); // This will be 0 for new trades

    const transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      expiryDate: new Date(formData.expiryDate),
      breakEvenPrice,
      profitLoss, // Will be 0 for new trades
      annualizedROR: undefined, // No ROR for new trades since P&L is 0
    };

    onSave(transaction);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate fees based on number of contracts (0.66 per contract)
      if (field === 'numberOfContracts') {
        const contracts = typeof value === 'number' ? value : parseInt(value as string) || 1;
        newData.fees = contracts * 0.66;
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
            {/* Portfolio - Full Width */}
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
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
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
                <Label htmlFor="expiryDate" className={errors.expiryDate ? 'text-destructive' : ''}>
                  Expiry Date
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={errors.expiryDate ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
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
                  value={formData.strikePrice}
                  onChange={(e) => handleChange('strikePrice', parseFloat(e.target.value) || 0)}
                  className={errors.strikePrice ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
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
                  value={formData.premium}
                  onChange={(e) => handleChange('premium', parseFloat(e.target.value) || 0)}
                  className={errors.premium ? 'border-destructive focus-visible:ring-destructive w-full' : 'w-full'}
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
                    ${calculateBreakEven().toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Held:</span>
                  <span className="ml-2 font-medium">
                    {calculateDaysHeld()}
                  </span>
                </div>
                  <div>
                    <span className="text-muted-foreground">Current P&L:</span>
                    <span className={`ml-2 font-medium ${calculateProfitLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${calculateProfitLoss().toFixed(2)} (Premium {formData.buyOrSell === 'Buy' ? 'paid' : 'received'})
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
                variant="default"
              >
                Save Trade
              </Button>
            </div>
          </form>
    </Modal>
  );
}
