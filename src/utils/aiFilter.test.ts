import { applyAiFilter } from './aiFilter';
import { OptionsTransaction, AIFilterSchema } from '@/types/options';

describe('applyAiFilter', () => {
  const getDisplayPnL = (t: OptionsTransaction) => t.profitLoss || 0;

  const transactions: OptionsTransaction[] = [
    { id: '1', stockSymbol: 'AAPL', callOrPut: 'Call', buyOrSell: 'Buy', profitLoss: 100 } as OptionsTransaction,
    { id: '2', stockSymbol: 'TSLA', callOrPut: 'Put', buyOrSell: 'Sell', profitLoss: -50 } as OptionsTransaction,
    { id: '3', stockSymbol: 'AAPL', callOrPut: 'Put', buyOrSell: 'Buy', profitLoss: -10 } as OptionsTransaction,
    { id: '4', stockSymbol: 'MSFT', callOrPut: 'Call', buyOrSell: 'Sell', profitLoss: 200 } as OptionsTransaction,
  ];

  it('filters by symbol', () => {
    const filters: AIFilterSchema = { symbol: 'AAPL' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('filters by type', () => {
    const filters: AIFilterSchema = { type: 'Put' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
  });

  it('filters by action', () => {
    const filters: AIFilterSchema = { action: 'Sell' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('4');
  });

  it('filters by outcome (win)', () => {
    const filters: AIFilterSchema = { outcome: 'win' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('4');
  });

  it('filters by outcome (loss)', () => {
    const filters: AIFilterSchema = { outcome: 'loss' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
  });

  it('filters by multiple criteria (losing AAPL puts)', () => {
    const filters: AIFilterSchema = { symbol: 'AAPL', type: 'Put', outcome: 'loss' };
    const result = applyAiFilter(transactions, filters, getDisplayPnL);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('3');
  });
});
