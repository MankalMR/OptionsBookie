/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import EtfHoldingsTable from './EtfHoldingsTable';
import type { EtfHolding } from '@/types/etf';

// Mock the UI table components to avoid deep shadcn dependency
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => <th className={className}>{children}</th>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => <td className={className}>{children}</td>,
}));

describe('EtfHoldingsTable', () => {
  const mockHoldings: EtfHolding[] = [
    { symbol: 'NVDA', description: 'NVIDIA CORP', weight: 0.0943 },
    { symbol: 'MSFT', description: 'MICROSOFT CORP', weight: 0.0836 },
    { symbol: 'AAPL', description: 'APPLE INC', weight: 0.0786 },
    { symbol: 'AMZN', description: 'AMAZON.COM INC', weight: 0.0521 },
    { symbol: 'META', description: 'META PLATFORMS INC', weight: 0.0488 },
  ];

  it('should render empty state when no holdings', () => {
    render(<EtfHoldingsTable holdings={[]} />);

    expect(screen.getByText('No holdings data available.')).toBeInTheDocument();
  });

  it('should render table headers', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} />);

    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Weight (%)')).toBeInTheDocument();
  });

  it('should render holdings with correct data', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} />);

    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('NVIDIA CORP')).toBeInTheDocument();
    expect(screen.getByText('9.43%')).toBeInTheDocument();

    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('MICROSOFT CORP')).toBeInTheDocument();
  });

  it('should respect the limit prop', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} limit={3} />);

    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('AMZN')).not.toBeInTheDocument();
    expect(screen.queryByText('META')).not.toBeInTheDocument();
  });

  it('should show "and X more" when holdings exceed limit', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} limit={3} />);

    expect(screen.getByText('and 2 more holdings')).toBeInTheDocument();
  });

  it('should show singular "holding" for exactly 1 more', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} limit={4} />);

    expect(screen.getByText('and 1 more holding')).toBeInTheDocument();
  });

  it('should not show "and X more" when all holdings fit', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} limit={10} />);

    expect(screen.queryByText(/and \d+ more/)).not.toBeInTheDocument();
  });

  it('should default limit to 10', () => {
    const manyHoldings: EtfHolding[] = Array.from({ length: 15 }, (_, i) => ({
      symbol: `SYM${i}`,
      description: `Company ${i}`,
      weight: 0.05,
    }));

    render(<EtfHoldingsTable holdings={manyHoldings} />);

    expect(screen.getByText('and 5 more holdings')).toBeInTheDocument();
  });

  it('should render rank numbers correctly', () => {
    render(<EtfHoldingsTable holdings={mockHoldings} limit={3} />);

    const cells = screen.getAllByRole('cell');
    // First row rank should be "1"
    expect(cells[0].textContent).toBe('1');
    // Second row rank should be "2"  
    expect(cells[4].textContent).toBe('2');
  });

  it('should format weight as percentage', () => {
    const holdings: EtfHolding[] = [
      { symbol: 'TEST', description: 'Test Corp', weight: 0.1234 },
    ];

    render(<EtfHoldingsTable holdings={holdings} />);

    expect(screen.getByText('12.34%')).toBeInTheDocument();
  });
});
