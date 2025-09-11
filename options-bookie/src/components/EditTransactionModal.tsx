'use client';

import { useState, useEffect, useMemo } from 'react';
import { OptionsTransaction, Portfolio } from '@/types/options';
import { calculateProfitLoss, calculateDaysHeld, calculateBreakEven } from '@/utils/optionsCalculations';

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
    tradeOpenDate: tradeOpenDate.toISOString().split('T')[0],
    expiryDate: expiryDate.toISOString().split('T')[0],
    callOrPut: transaction.callOrPut,
    buyOrSell: transaction.buyOrSell,
    stockPriceCurrent: transaction.stockPriceCurrent,
    strikePrice: transaction.strikePrice,
    premium: transaction.premium,
    numberOfContracts: transaction.numberOfContracts,
    fees: transaction.fees,
    status: transaction.status,
    exitPrice: transaction.exitPrice || 0,
    closeDate: closeDate ? closeDate.toISOString().split('T')[0] : '',
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
    if (!formData.stockPriceCurrent || formData.stockPriceCurrent <= 0) {
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
      stockPriceCurrent: formData.stockPriceCurrent,
      tradeOpenDate: tradeOpenDate,
      expiryDate: expiryDate,
      closeDate: closeDate,
    };

    return calculateProfitLoss(tempTransaction, formData.stockPriceCurrent);
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
    if (formData.status === 'Closed' && formData.closeDate) {
      const openDate = new Date(formData.tradeOpenDate);
      const closeDate = new Date(formData.closeDate);
      const diffTime = closeDate.getTime() - openDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    // Create a proper transaction object with Date objects for calculateDaysHeld
    const transactionWithDates = {
      ...transaction,
      tradeOpenDate: tradeOpenDate,
      expiryDate: expiryDate,
      closeDate: closeDate,
    };
    return calculateDaysHeld(transactionWithDates);
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

    const daysToExpiry = calculateDaysToExpiry(formData.expiryDate);
    const breakEvenPrice = calculateBreakEvenPrice();
    const daysHeld = calculateDaysHeldValue();
    const profitLoss = formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss();

    const updates: Partial<OptionsTransaction> = {
      portfolioId: formData.portfolioId,
      stockSymbol: formData.stockSymbol,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      expiryDate: new Date(formData.expiryDate),
      callOrPut: formData.callOrPut,
      buyOrSell: formData.buyOrSell,
      stockPriceCurrent: formData.stockPriceCurrent,
      strikePrice: formData.strikePrice,
      premium: formData.premium,
      numberOfContracts: formData.numberOfContracts,
      fees: formData.fees,
      status: formData.status,
      daysToExpiry,
      breakEvenPrice,
      profitLoss,
      daysHeld,
      updatedAt: new Date(),
    };

    if (formData.status === 'Closed') {
      updates.exitPrice = formData.exitPrice;
      updates.closeDate = new Date(formData.closeDate);
      updates.annualizedROR = daysHeld > 0 && profitLoss !== 0 ?
        ((profitLoss / (formData.premium * formData.numberOfContracts * 100)) * (365 / daysHeld)) * 100 :
        undefined;
    } else {
      updates.exitPrice = undefined;
      updates.closeDate = undefined;
      updates.annualizedROR = undefined;
    }

    onSave(transaction.id, updates);
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStatusChange = (newStatus: 'Open' | 'Closed' | 'Expired' | 'Assigned') => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      // Clear exit data when opening trade
      ...(newStatus === 'Open' && { exitPrice: 0, closeDate: '' })
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Trade</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Portfolio Selection */}
            {portfolios.length > 0 && (
              <div>
                <label htmlFor="portfolioId" className="block text-sm font-medium text-gray-700">
                  Portfolio
                </label>
                <select
                  id="portfolioId"
                  value={formData.portfolioId}
                  onChange={(e) => handleChange('portfolioId', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                >
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} {portfolio.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                {errors.portfolioId && <p className="mt-1 text-sm text-red-600">{errors.portfolioId}</p>}
              </div>
            )}

            {/* Status Selection */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Trade Status</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Open"
                    checked={formData.status === 'Open'}
                    onChange={(e) => handleStatusChange(e.target.value as 'Open')}
                    className="mr-2"
                  />
                  <span className="text-sm">Open</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Closed"
                    checked={formData.status === 'Closed'}
                    onChange={(e) => handleStatusChange(e.target.value as 'Closed')}
                    className="mr-2"
                  />
                  <span className="text-sm">Closed</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Expired"
                    checked={formData.status === 'Expired'}
                    onChange={(e) => handleStatusChange(e.target.value as 'Expired')}
                    className="mr-2"
                  />
                  <span className="text-sm">Expired</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Assigned"
                    checked={formData.status === 'Assigned'}
                    onChange={(e) => handleStatusChange(e.target.value as 'Assigned')}
                    className="mr-2"
                  />
                  <span className="text-sm">Assigned</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock Symbol</label>
                <input
                  type="text"
                  value={formData.stockSymbol}
                  onChange={(e) => handleChange('stockSymbol', e.target.value.toUpperCase())}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                    errors.stockSymbol ? 'border-red-500' : ''
                  }`}
                />
                {errors.stockSymbol && <p className="mt-1 text-sm text-red-600">{errors.stockSymbol}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.callOrPut}
                  onChange={(e) => handleChange('callOrPut', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                >
                  <option value="Call">Call</option>
                  <option value="Put">Put</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <select
                  value={formData.buyOrSell}
                  onChange={(e) => handleChange('buyOrSell', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                >
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Current Stock Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stockPriceCurrent}
                  onChange={(e) => handleChange('stockPriceCurrent', parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Open Date</label>
                <input
                  type="date"
                  value={formData.tradeOpenDate}
                  onChange={(e) => handleChange('tradeOpenDate', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                    errors.expiryDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Strike Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.strikePrice}
                  onChange={(e) => handleChange('strikePrice', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                    errors.strikePrice ? 'border-red-500' : ''
                  }`}
                />
                {errors.strikePrice && <p className="mt-1 text-sm text-red-600">{errors.strikePrice}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Premium</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.premium}
                  onChange={(e) => handleChange('premium', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                    errors.premium ? 'border-red-500' : ''
                  }`}
                />
                {errors.premium && <p className="mt-1 text-sm text-red-600">{errors.premium}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contracts</label>
                <input
                  type="number"
                  value={formData.numberOfContracts}
                  onChange={(e) => handleChange('numberOfContracts', parseInt(e.target.value) || 1)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                    errors.numberOfContracts ? 'border-red-500' : ''
                  }`}
                />
                {errors.numberOfContracts && <p className="mt-1 text-sm text-red-600">{errors.numberOfContracts}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fees</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fees}
                  onChange={(e) => handleChange('fees', parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Exit Information - Only show when closing trade */}
            {formData.status === 'Closed' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="text-sm font-medium text-red-800 mb-3">Exit Information (Required for Closed Trades)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.exitPrice}
                      onChange={(e) => handleChange('exitPrice', parseFloat(e.target.value) || 0)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                        errors.exitPrice ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.exitPrice && <p className="mt-1 text-sm text-red-600">{errors.exitPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Close Date</label>
                    <input
                      type="date"
                      value={formData.closeDate}
                      onChange={(e) => handleChange('closeDate', e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                        errors.closeDate ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.closeDate && <p className="mt-1 text-sm text-red-600">{errors.closeDate}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Fields */}
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Calculated Fields</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Days to Expiry:</span>
                  <span className="ml-2 font-medium">
                    {formData.expiryDate ? calculateDaysToExpiry(formData.expiryDate) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Break Even:</span>
                  <span className="ml-2 font-medium">
                    ${calculateBreakEvenPrice().toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Days Held:</span>
                  <span className="ml-2 font-medium">
                    {calculateDaysHeldValue()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {formData.status === 'Closed' ? 'Final P&L:' : 'Current P&L:'}
                  </span>
                  <span className={`ml-2 font-medium ${
                    (formData.status === 'Closed' ? calculateFinalProfitLoss() : calculateCurrentProfitLoss()) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.status === 'Closed'
                      ? (formData.exitPrice > 0 ? `$${calculateFinalProfitLoss().toFixed(2)}` : 'Enter exit price')
                      : (formData.stockPriceCurrent > 0 ? `$${calculateCurrentProfitLoss().toFixed(2)}` : 'Enter stock price')
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isFormValid
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
