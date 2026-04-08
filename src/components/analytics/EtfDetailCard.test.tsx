/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EtfDetailCard from './EtfDetailCard';
import type { EtfProfile } from '@/types/etf';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  ),
}));

jest.mock('./EtfHoldingsTable', () => {
  return function MockEtfHoldingsTable({ holdings, limit }: { holdings: any[]; limit: number }) {
    return <div data-testid="holdings-table">Holdings: {holdings.length} (limit {limit})</div>;
  };
});

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Heart: ({ className }: { className?: string }) => <svg data-testid="heart-icon" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <svg data-testid="alert-icon" className={className} />,
  RefreshCw: ({ className }: { className?: string }) => <svg data-testid="refresh-icon" className={className} />,
}));

describe('EtfDetailCard', () => {
  const baseProfile: EtfProfile = {
    ticker: 'QQQ',
    fundName: 'Invesco QQQ Trust',
    issuer: null,
    netAssets: 365600000000,
    netExpenseRatio: 0.002,
    dividendYield: 0.0048,
    dividendFrequency: null,
    exDividendDate: null,
    benchmarkIndex: null,
    assetCategory: null,
    inceptionDate: '1999-03-10',
    portfolioTurnover: 0.08,
    leveraged: 'NO',
    topHoldings: [
      { symbol: 'NVDA', description: 'NVIDIA CORP', weight: 0.0943 },
    ],
    topTenConcentration: 0.561,
    sectorAllocation: [
      { sector: 'Information Technology', weight: 0.517 },
    ],
    cachedAt: '2026-04-07T12:00:00Z',
    isStale: false,
    isSaved: false,
  };

  const onToggleSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ticker and fund name', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('QQQ')).toBeInTheDocument();
    expect(screen.getByText('Invesco QQQ Trust')).toBeInTheDocument();
  });

  it('should render stats grid with formatted values', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('$365.6B')).toBeInTheDocument();
    expect(screen.getByText('0.20%')).toBeInTheDocument();
    expect(screen.getByText('0.48%')).toBeInTheDocument();
    expect(screen.getByText('8.00%')).toBeInTheDocument();
    expect(screen.getByText('56.10%')).toBeInTheDocument();
  });

  it('should show N/A for null values', () => {
    const profile = { ...baseProfile, netAssets: null, dividendYield: null };
    render(<EtfDetailCard profile={profile} onToggleSave={onToggleSave} />);

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should call onToggleSave when heart is clicked', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    const heartButton = screen.getByTestId('heart-icon').closest('button')!;
    fireEvent.click(heartButton);

    expect(onToggleSave).toHaveBeenCalledTimes(1);
  });

  it('should show filled heart when saved', () => {
    const savedProfile = { ...baseProfile, isSaved: true };
    render(<EtfDetailCard profile={savedProfile} onToggleSave={onToggleSave} />);

    const heartIcon = screen.getByTestId('heart-icon');
    expect(heartIcon.getAttribute('class')).toContain('fill-red-500');
  });

  it('should show outline heart when not saved', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    const heartIcon = screen.getByTestId('heart-icon');
    expect(heartIcon.getAttribute('class')).toContain('text-muted-foreground');
    expect(heartIcon.getAttribute('class')).not.toContain('fill-red-500');
  });

  it('should show stale badge when data is stale', () => {
    const staleProfile = { ...baseProfile, isStale: true };
    render(<EtfDetailCard profile={staleProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('Stale data')).toBeInTheDocument();
    expect(screen.getByText(/refreshing in background/i)).toBeInTheDocument();
  });

  it('should not show stale badge when data is fresh', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.queryByText('Stale data')).not.toBeInTheDocument();
  });

  it('should show leveraged ETF warning badge', () => {
    const leveragedProfile = { ...baseProfile, leveraged: 'YES' };
    render(<EtfDetailCard profile={leveragedProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('Leveraged ETF')).toBeInTheDocument();
  });

  it('should not show leveraged badge for non-leveraged ETFs', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.queryByText('Leveraged ETF')).not.toBeInTheDocument();
  });

  it('should show highly concentrated badge when top-10 > 60%', () => {
    const concentratedProfile = { ...baseProfile, topTenConcentration: 0.75 };
    render(<EtfDetailCard profile={concentratedProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('Highly Concentrated')).toBeInTheDocument();
  });

  it('should not show concentrated badge when top-10 <= 60%', () => {
    const diverseProfile = { ...baseProfile, topTenConcentration: 0.45 };
    render(<EtfDetailCard profile={diverseProfile} onToggleSave={onToggleSave} />);

    expect(screen.queryByText('Highly Concentrated')).not.toBeInTheDocument();
  });

  it('should render holdings table when holdings exist', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByTestId('holdings-table')).toBeInTheDocument();
    expect(screen.getByText('Top Holdings')).toBeInTheDocument();
  });

  it('should not render holdings section when empty', () => {
    const noHoldingsProfile = { ...baseProfile, topHoldings: [] };
    render(<EtfDetailCard profile={noHoldingsProfile} onToggleSave={onToggleSave} />);

    expect(screen.queryByText('Top Holdings')).not.toBeInTheDocument();
  });

  it('should render sector allocation when sectors exist', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('Sector Allocation')).toBeInTheDocument();
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
    expect(screen.getByText('51.7%')).toBeInTheDocument();
  });

  it('should not render sector section when empty', () => {
    const noSectorsProfile = { ...baseProfile, sectorAllocation: [] };
    render(<EtfDetailCard profile={noSectorsProfile} onToggleSave={onToggleSave} />);

    expect(screen.queryByText('Sector Allocation')).not.toBeInTheDocument();
  });

  it('should format AUM in millions', () => {
    const smallProfile = { ...baseProfile, netAssets: 500000000 };
    render(<EtfDetailCard profile={smallProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('$500.0M')).toBeInTheDocument();
  });

  it('should format AUM in thousands', () => {
    const tinyProfile = { ...baseProfile, netAssets: 50000 };
    render(<EtfDetailCard profile={tinyProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText('$50.0K')).toBeInTheDocument();
  });

  it('should render last updated timestamp', () => {
    render(<EtfDetailCard profile={baseProfile} onToggleSave={onToggleSave} />);

    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });
});
