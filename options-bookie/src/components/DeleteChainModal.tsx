'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Link } from 'lucide-react';
import { OptionsTransaction, TradeChain } from '@/types/options';

interface DeleteChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chainId: string | null;
  chainTransactions: OptionsTransaction[];
  chainInfo?: TradeChain | null;
}

export default function DeleteChainModal({
  isOpen,
  onClose,
  onConfirm,
  chainId,
  chainTransactions,
  chainInfo
}: DeleteChainModalProps) {
  if (!isOpen || !chainId || chainTransactions.length === 0) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const stockSymbol = chainTransactions[0]?.stockSymbol || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border border-border max-w-md shadow-2xl rounded-lg bg-white dark:bg-gray-900">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-medium">Delete Chain</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Link className="h-4 w-4" />
              <span className="font-medium">{stockSymbol} Chain</span>
              <span className="text-xs bg-muted text-muted-foreground600 px-2 py-1 rounded">
                {chainTransactions.length} transactions
              </span>
            </div>

            <p className="text-muted-foreground600">
              Are you sure you want to delete this entire chain? This will permanently delete all {chainTransactions.length} transactions in this chain.
            </p>

            {/* Transaction List */}
            <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
              <div className="text-sm font-medium text-muted-foreground mb-2">Transactions to be deleted:</div>
              {chainTransactions.map((transaction, index) => (
                <div key={transaction.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{transaction.stockSymbol}</span>
                    <span className="text-muted-foreground">{transaction.callOrPut} {transaction.buyOrSell}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'Open' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200' :
                    transaction.status === 'Closed' ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200' :
                    transaction.status === 'Rolled' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' :
                    transaction.status === 'Expired' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200' :
                    transaction.status === 'Assigned' ? 'bg-pink-100 dark:bg-pink-950/30 text-pink-800 dark:text-pink-200' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Warning</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                This action cannot be undone. All P&L history and chain relationships will be permanently lost.
              </p>
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
              Delete Chain
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
