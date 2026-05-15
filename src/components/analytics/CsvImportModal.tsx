import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Upload, CheckCircle, AlertTriangle, Info, Copy } from 'lucide-react';
import { BrokerType, CsvImporters } from '@/utils/csvImporters';
import { analyzeImport, DeduplicatedTransaction } from '@/utils/duplicateDetection';
import { OptionsTransaction } from '@/types/options';
import { logger } from "@/lib/logger";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: OptionsTransaction[];
  onImportComplete: (importedTransactions: Partial<OptionsTransaction>[]) => void;
}

export function CsvImportModal({ isOpen, onClose, existingTransactions, onImportComplete }: CsvImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [broker, setBroker] = useState<BrokerType>('schwab');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsedData, setParsedData] = useState<DeduplicatedTransaction[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setParsedData([]);
      setSelectedRows(new Set());
      setError(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);

    try {
      const text = await file.text();
      const adapter = CsvImporters[broker];

      if (!adapter) {
        throw new Error(`Broker adapter for ${broker} not found`);
      }

      const rawTransactions = await adapter.parse(text);
      const deduplicated = analyzeImport(rawTransactions, existingTransactions);

      setParsedData(deduplicated);

      // Auto-select clean and linkedToOpen transactions
      const initialSelected = new Set<number>();
      deduplicated.forEach((t, i) => {
        if (t.dedupStatus === 'Clean' || t.dedupStatus === 'LinkedToOpen') {
          initialSelected.add(i);
        }
      });
      setSelectedRows(initialSelected);

      setStep(2);
    } catch (err: unknown) {
      logger.error({ err }, 'Error parsing CSV');
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsParsing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    const toImport = parsedData.filter((_, i) => selectedRows.has(i));
    if (toImport.length === 0) {
      onClose();
      return;
    }

    // Clean up dedup properties before passing up
    const cleanToImport = toImport.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dedupStatus, matchedTransactionIds, originalCsvRow, ...copy } = t;
      return copy;
    });

    onImportComplete(cleanToImport);
    setStep(3);
  };

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Clean': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'LinkedToOpen': return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      case 'PartialMatch': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'ExactDuplicate': return <X className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center overflow-y-auto">
      <div className="bg-card text-card-foreground shadow-lg border rounded-xl w-full max-w-4xl mx-4 my-8 relative flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <div>
            <h2 className="text-xl font-semibold">Import Transactions from CSV</h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 && "Select your broker and upload your transaction history"}
              {step === 2 && "Review and reconcile imported transactions"}
              {step === 3 && "Import Complete"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="broker-select">Select Broker</Label>
                <Select value={broker} onValueChange={(val) => setBroker(val as BrokerType)}>
                  <SelectTrigger id="broker-select">
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schwab">Charles Schwab</SelectItem>
                    <SelectItem value="robinhood" disabled>Robinhood (Coming Soon)</SelectItem>
                    <SelectItem value="moomoo" disabled>Moomoo (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-2 border-dashed rounded-lg p-12 text-center space-y-4 hover:bg-muted/50 transition-colors">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                  >
                    {isParsing ? 'Parsing...' : 'Select CSV File'}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground">or drag and drop your CSV file here</p>
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground mb-4 bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/> Clean (New)</div>
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-yellow-500"/> Links to Open</div>
                <div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-orange-500"/> Partial Match</div>
                <div className="flex items-center gap-1"><X className="h-4 w-4 text-red-500"/> Exact Duplicate</div>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === parsedData.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(new Set(parsedData.map((_, i) => i)));
                            } else {
                              setSelectedRows(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Strike/Expiry</th>
                      <th className="p-3 text-right">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((tx, idx) => (
                      <tr
                        key={idx}
                        className={`border-t hover:bg-muted/50 ${!selectedRows.has(idx) ? 'opacity-50' : ''}`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(idx)}
                            onChange={() => toggleRow(idx)}
                          />
                        </td>
                        <td className="p-3 flex items-center gap-2">
                          {getStatusIcon(tx.dedupStatus)}
                          <span className="hidden md:inline">{tx.dedupStatus}</span>
                        </td>
                        <td className="p-3">{tx.tradeOpenDate ? new Date(tx.tradeOpenDate).toLocaleDateString() : ''}</td>
                        <td className="p-3 font-medium">{tx.stockSymbol}</td>
                        <td className="p-3">{tx.buyOrSell} {tx.callOrPut}</td>
                        <td className="p-3">
                          ${tx.strikePrice} / {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString() : ''}
                        </td>
                        <td className="p-3 text-right">${tx.premium?.toFixed(2)}</td>
                      </tr>
                    ))}
                    {parsedData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No valid options transactions found in this CSV.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-semibold">Import Successful</h3>
              <p className="text-muted-foreground">Your transactions have been added to your portfolio.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-muted/20 shrink-0 flex justify-end gap-3">
          {step === 1 && (
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleConfirmImport}>
                Import {selectedRows.size} Transactions
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={onClose}>Done</Button>
          )}
        </div>
      </div>
    </div>
  );
}
