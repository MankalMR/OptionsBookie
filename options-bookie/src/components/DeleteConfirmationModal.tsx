'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { OptionsTransaction } from '@/types/options';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: OptionsTransaction | null;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  transaction
}: DeleteConfirmationModalProps) {
  if (!isOpen || !transaction) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={handleOverlayClick}>
      <div className="relative top-20 mx-auto p-6 border w-96 shadow-lg rounded-md bg-card">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-medium">Delete Transaction</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm text-card-foreground">
                <div className="font-medium">Symbol:</div>
                <div>{transaction.stockSymbol}</div>

                <div className="font-medium">Type:</div>
                <div>{transaction.callOrPut} {transaction.buyOrSell}</div>

                <div className="font-medium">Strike:</div>
                <div>${transaction.strikePrice.toFixed(2)}</div>

                <div className="font-medium">Contracts:</div>
                <div>{transaction.numberOfContracts}</div>

                <div className="font-medium">Status:</div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'Open' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200' :
                    transaction.status === 'Closed' ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200' :
                    transaction.status === 'Rolled' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Transaction
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
