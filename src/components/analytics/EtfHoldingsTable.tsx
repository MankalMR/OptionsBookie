'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EtfHolding } from '@/types/etf';

interface EtfHoldingsTableProps {
  holdings: EtfHolding[];
  limit?: number;
}

export default function EtfHoldingsTable({ holdings, limit = 10 }: EtfHoldingsTableProps) {
  const displayHoldings = holdings.slice(0, limit);
  const remaining = holdings.length - limit;

  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No holdings data available.</p>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Weight (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayHoldings.map((holding, index) => (
            <TableRow key={holding.symbol || index}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{holding.symbol}</TableCell>
              <TableCell className="text-muted-foreground">{holding.description}</TableCell>
              <TableCell className="text-right">
                {(holding.weight * 100).toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-2 px-2">
          and {remaining} more holding{remaining !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
