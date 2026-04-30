/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EtfCard from './EtfCard';
import type { EtfProfile } from '@/types/etf';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={className}>{children}</span>,
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: () => <svg data-testid="alert-triangle" />,
  RefreshCw: () => <svg data-testid="refresh-cw" />,
  Star: ({ fill }: { fill?: string }) => <svg data-testid="star-icon" data-fill={fill} />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
  ChevronUp: () => <svg data-testid="chevron-up" />,
  X: () => <svg data-testid="x-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
}));

// Mock Holdings Table
jest.mock('./EtfHoldingsTable', () => ({
  __esModule: true,
  default: () => <div data-testid="holdings-table" />,
}));

describe('EtfCard', () => {
  const mockProfile: EtfProfile = {
    ticker: 'QQQ',
    fundName: 'Invesco QQQ Trust',
    issuer: 'Invesco',
    netAssets: 365600000000,
    netExpenseRatio: 0.002,
    dividendYield: 0.006,
    dividendFrequency: 'Quarterly',
    exDividendDate: '2024-03-20',
    benchmarkIndex: 'NASDAQ-100',
    assetCategory: 'Equity',
    inceptionDate: '1999-03-10',
    portfolioTurnover: 0.07,
    leveraged: 'NO',
    topHoldings: [
      { symbol: 'AAPL', description: 'Apple Inc', weight: 0.08 }
    ],
    topTenConcentration: 0.45,
    sectorAllocation: [
      { sector: 'Information Technology', weight: 0.50 }
    ],
    cachedAt: new Date().toISOString(),
    isStale: false,
    isSaved: false
  };

  const onToggleSave = jest.fn();
  const onRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ticker and fund name', () => {
    render(<EtfCard data={mockProfile} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    expect(screen.getByText('QQQ')).toBeInTheDocument();
    expect(screen.getByText('Invesco QQQ Trust')).toBeInTheDocument();
  });

  it('should render stats grid with initial values', () => {
    render(<EtfCard data={mockProfile} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    expect(screen.getByText('Expense Ratio')).toBeInTheDocument();
    expect(screen.getByText('0.20%')).toBeInTheDocument();
    expect(screen.getByText('Yield (TTM)')).toBeInTheDocument();
    expect(screen.getByText('0.60%')).toBeInTheDocument();
  });

  it('should toggle expansion on click', () => {
    render(<EtfCard data={mockProfile} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    // Total AUM is hidden by default
    expect(screen.queryByText('Total AUM')).not.toBeInTheDocument();
    
    const expandButton = screen.getByText(/Show More/i);
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Total AUM')).toBeInTheDocument();
    expect(screen.getByText('$365.6B')).toBeInTheDocument();
    expect(screen.getByText(/Show Less/i)).toBeInTheDocument();
  });

  it('should call onToggleSave when star is clicked', () => {
    render(<EtfCard data={mockProfile} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    const starButton = screen.getByTestId('star-icon').closest('button')!;
    fireEvent.click(starButton);
    
    expect(onToggleSave).toHaveBeenCalled();
  });

  it('should call onRemove when X is clicked', () => {
    render(<EtfCard data={mockProfile} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    const removeButton = screen.getByTestId('x-icon').closest('button')!;
    fireEvent.click(removeButton);
    
    expect(onRemove).toHaveBeenCalled();
  });

  it('should show gold star when saved', () => {
    render(<EtfCard data={{ ...mockProfile, isSaved: true }} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    const starIcon = screen.getByTestId('star-icon');
    expect(starIcon.getAttribute('data-fill')).toBe('#facc15');
  });

  it('should show leveraged warning for leveraged ETFs', () => {
    render(<EtfCard data={{ ...mockProfile, leveraged: 'YES' }} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    expect(screen.getByText(/Leveraged/i)).toBeInTheDocument();
  });

  it('should show high concentration badge when appropriate', () => {
    render(<EtfCard data={{ ...mockProfile, topTenConcentration: 0.75 }} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    expect(screen.getByText(/High Concentration/i)).toBeInTheDocument();
  });

  it('should show AI Insight badge when data is AI generated', () => {
    render(<EtfCard data={{ ...mockProfile, isAiGenerated: true }} onToggleSave={onToggleSave} onRemove={onRemove} />);
    
    expect(screen.getByText(/AI Insight/i)).toBeInTheDocument();
  });
});
