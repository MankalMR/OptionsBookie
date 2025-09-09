'use client';

import { useState, useEffect } from 'react';
import { Portfolio } from '@/types/options';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioCreated: () => void;
  portfolio?: Portfolio | null;
  onPortfolioUpdated?: () => void;
}

export default function PortfolioModal({
  isOpen,
  onClose,
  onPortfolioCreated,
  portfolio,
  onPortfolioUpdated,
}: PortfolioModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!portfolio;

  useEffect(() => {
    if (isOpen) {
      if (portfolio) {
        setFormData({
          name: portfolio.name,
          description: portfolio.description || '',
          isDefault: portfolio.isDefault,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isDefault: false,
        });
      }
      setErrors({});
    }
  }, [isOpen, portfolio]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Portfolio name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = isEdit ? `/api/portfolios/${portfolio.id}` : '/api/portfolios';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onClose();
        if (isEdit && onPortfolioUpdated) {
          onPortfolioUpdated();
        } else {
          onPortfolioCreated();
        }
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to save portfolio' });
      }
    } catch (error) {
      console.error('Error saving portfolio:', error);
      setErrors({ submit: 'Failed to save portfolio' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {isEdit ? 'Edit Portfolio' : 'Add New Portfolio'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Portfolio Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900 ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder="Enter portfolio name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-900"
                placeholder="Enter portfolio description (optional)"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isDefault"
                id="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                Set as default portfolio
              </label>
            </div>

            {errors.submit && (
              <div className="text-sm text-red-600">{errors.submit}</div>
            )}

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
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
