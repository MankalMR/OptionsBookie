/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SavedEtfsList from './SavedEtfsList';
import type { SavedEtf } from '@/types/etf';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="saved-card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock('lucide-react', () => ({
  Heart: ({ className }: { className?: string }) => <svg data-testid="heart-icon" className={className} />,
  Info: ({ className }: { className?: string }) => <svg data-testid="info-icon" className={className} />,
}));

describe('SavedEtfsList', () => {
  const mockSavedEtfs: SavedEtf[] = [
    {
      ticker: 'QQQ',
      fundName: 'Invesco QQQ Trust',
      netExpenseRatio: 0.002,
      dividendYield: 0.0048,
      netAssets: 365600000000,
      savedAt: '2026-04-01T00:00:00Z',
      notes: null,
      isStale: false,
    },
    {
      ticker: 'SPY',
      fundName: 'SPDR S&P 500',
      netExpenseRatio: 0.00093,
      dividendYield: 0.012,
      netAssets: 500000000000,
      savedAt: '2026-04-02T00:00:00Z',
      notes: 'Core holding',
      isStale: false,
    },
  ];

  const onSelect = jest.fn();
  const onUnsave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading spinner when loading', () => {
    render(
      <SavedEtfsList savedEtfs={[]} loading={true} onSelect={onSelect} onUnsave={onUnsave} />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('should render empty state when no saved ETFs', () => {
    render(
      <SavedEtfsList savedEtfs={[]} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    expect(screen.getByText('No saved ETFs yet.')).toBeInTheDocument();
    expect(screen.getByText(/Search for an ETF/)).toBeInTheDocument();
  });

  it('should render saved ETF cards', () => {
    render(
      <SavedEtfsList savedEtfs={mockSavedEtfs} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    expect(screen.getByText('QQQ')).toBeInTheDocument();
    expect(screen.getByText('Invesco QQQ Trust')).toBeInTheDocument();
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.getByText('SPDR S&P 500')).toBeInTheDocument();
  });

  it('should display formatted expense ratio, yield, and AUM', () => {
    render(
      <SavedEtfsList savedEtfs={mockSavedEtfs} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    expect(screen.getByText('ER: 0.20%')).toBeInTheDocument();
    expect(screen.getByText('Yield: 0.48%')).toBeInTheDocument();
    expect(screen.getByText('AUM: $365.6B')).toBeInTheDocument();
  });

  it('should call onSelect when card body is clicked', () => {
    render(
      <SavedEtfsList savedEtfs={mockSavedEtfs} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    fireEvent.click(screen.getByText('QQQ'));

    expect(onSelect).toHaveBeenCalledWith('QQQ');
  });

  it('should call onUnsave when heart icon is clicked', () => {
    render(
      <SavedEtfsList savedEtfs={mockSavedEtfs} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    const heartButtons = screen.getAllByTestId('heart-icon');
    const firstHeartButton = heartButtons[0].closest('button')!;
    fireEvent.click(firstHeartButton);

    expect(onUnsave).toHaveBeenCalledWith('QQQ');
    // Should not trigger onSelect
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should handle null values in display', () => {
    const etfWithNulls: SavedEtf[] = [{
      ticker: 'TEST',
      fundName: null,
      netExpenseRatio: null,
      dividendYield: null,
      netAssets: null,
      savedAt: '2026-04-01T00:00:00Z',
      notes: null,
      isStale: false,
    }];

    render(
      <SavedEtfsList savedEtfs={etfWithNulls} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('ER: -')).toBeInTheDocument();
    expect(screen.getByText('Yield: -')).toBeInTheDocument();
    expect(screen.getByText('AUM: -')).toBeInTheDocument();
  });

  it('should render all heart icons as filled (saved)', () => {
    render(
      <SavedEtfsList savedEtfs={mockSavedEtfs} loading={false} onSelect={onSelect} onUnsave={onUnsave} />
    );

    const hearts = screen.getAllByTestId('heart-icon');
    hearts.forEach((heart: HTMLElement) => {
      expect(heart.getAttribute('class')).toContain('fill-red-500');
    });
  });
});
