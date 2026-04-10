/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EtfSearchBar from './EtfSearchBar';
import type { EtfSearchResult } from '@/types/etf';

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} data-testid="search-input" {...props} />
  ),
}));

jest.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => <svg data-testid="search-icon" className={className} />,
  Heart: ({ className }: { className?: string }) => <svg data-testid="heart-icon" className={className} />,
}));

describe('EtfSearchBar', () => {
  const mockResults: EtfSearchResult[] = [
    { ticker: 'QQQ', fundName: 'Invesco QQQ Trust', isCached: true, isSaved: false },
    { ticker: 'QQQM', fundName: 'Invesco NASDAQ 100', isCached: true, isSaved: true },
  ];

  const onSearch = jest.fn();
  const onSelect = jest.fn();
  const onToggleSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render search input with placeholder', () => {
    render(
      <EtfSearchBar results={[]} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search ETF ticker or name...')).toBeInTheDocument();
  });

  it('should debounce search calls by 400ms', () => {
    render(
      <EtfSearchBar results={[]} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');

    fireEvent.change(input, { target: { value: 'Q' } });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onSearch).toHaveBeenCalledWith('Q');
  });

  it('should not search for empty input', () => {
    render(
      <EtfSearchBar results={[]} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: '' } });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('should show dropdown when results exist', () => {
    const { rerender } = render(
      <EtfSearchBar results={[]} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'QQQ' } });

    // Re-render with results (simulating async response)
    rerender(
      <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('QQQ')).toBeInTheDocument();
    expect(screen.getByText('Invesco QQQ Trust')).toBeInTheDocument();
    expect(screen.getByText('QQQM')).toBeInTheDocument();
  });

  it('should call onSelect when a result is clicked', () => {
    render(
      <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'QQQ' } });

    // Click the result row (the div with role="option")
    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(onSelect).toHaveBeenCalledWith('QQQ');
  });

  it('should show loading spinner when loading', () => {
    render(
      <EtfSearchBar results={[]} loading={true} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('should hide dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
      </div>
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'QQQ' } });

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should update input value to ticker when result is selected', () => {
    render(
      <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'QQQ' } });

    const options = screen.getAllByRole('option');
    fireEvent.click(options[0]);

    expect(input.value).toBe('QQQ');
  });

  it('should support keyboard selection with Enter', () => {
    render(
      <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'QQQ' } });

    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('QQQ');
  });

  it('should support keyboard selection with Space', () => {
    render(
      <EtfSearchBar results={mockResults} loading={false} onSearch={onSearch} onSelect={onSelect} onToggleSave={onToggleSave} />
    );

    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'QQQ' } });

    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: ' ' });

    expect(onSelect).toHaveBeenCalledWith('QQQ');
  });
});
