'use client';

import { useState } from 'react';
import { OptionsTransaction } from '@/types/options';
import { calculateProfitLoss as calculateProfitLossUtil, calculateNewTradeProfitLoss } from '@/utils/optionsCalculations';

interface AddTransactionModalProps {
  onClose: () => void;
  onSave: (transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function AddTransactionModal({ onClose, onSave }: AddTransactionModalProps) {
  const [formData, setFormData] = useState({
    stockSymbol: '',
    tradeOpenDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    callOrPut: 'Call' as 'Call' | 'Put',
    buyOrSell: 'Buy' as 'Buy' | 'Sell',
    stockPriceCurrent: 0,
    strikePrice: 0,
    premium: 0,
    numberOfContracts: 1,
    fees: 0,
    status: 'Open' as 'Open' | 'Closed' | 'Rolled Forward',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    // For new trades, show premium received/paid as P&L
    const contracts = formData.numberOfContracts;
    const premium = formData.premium;

    let profitLoss = 0;
    if (formData.buyOrSell === 'Buy') {
      // If you bought the option, you paid the premium (negative P&L until closed)
      profitLoss = -premium * contracts * 100;
    } else {
      // If you sold the option, you received the premium (positive P&L until closed)
      profitLoss = premium * contracts * 100;
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

    const daysToExpiry = calculateDaysToExpiry(formData.expiryDate);
    const breakEvenPrice = calculateBreakEven();
    const profitLoss = calculateProfitLoss(); // This will be 0 for new trades
    const daysHeld = calculateDaysHeld();

    const transaction: Omit<OptionsTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      tradeOpenDate: new Date(formData.tradeOpenDate),
      expiryDate: new Date(formData.expiryDate),
      daysToExpiry,
      breakEvenPrice,
      stockPriceCurrent: formData.stockPriceCurrent || 0,
      profitLoss, // Will be 0 for new trades
      daysHeld,
      annualizedROR: undefined, // No ROR for new trades since P&L is 0
    };

    onSave(transaction);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Trade</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock Symbol</label>
                <input
                  type="text"
                  value={formData.stockSymbol}
                  onChange={(e) => handleChange('stockSymbol', e.target.value.toUpperCase())}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    errors.stockSymbol ? 'border-red-500' : ''
                  }`}
                  placeholder="AAPL"
                />
                {errors.stockSymbol && <p className="mt-1 text-sm text-red-600">{errors.stockSymbol}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.callOrPut}
                  onChange={(e) => handleChange('callOrPut', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Rolled Forward">Rolled Forward</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Open Date</label>
                <input
                  type="date"
                  value={formData.tradeOpenDate}
                  onChange={(e) => handleChange('tradeOpenDate', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Current Stock Price (Optional)</label>
              <input
                type="number"
                step="0.01"
                value={formData.stockPriceCurrent}
                onChange={(e) => handleChange('stockPriceCurrent', parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

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
                    ${calculateBreakEven().toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Days Held:</span>
                  <span className="ml-2 font-medium">
                    {calculateDaysHeld()}
                  </span>
                </div>
                  <div>
                    <span className="text-gray-600">Current P&L:</span>
                    <span className={`ml-2 font-medium ${calculateProfitLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${calculateProfitLoss().toFixed(2)} (Premium {formData.buyOrSell === 'Buy' ? 'paid' : 'received'})
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Trade
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
