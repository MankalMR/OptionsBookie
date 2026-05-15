import { test, expect } from '@jest/globals';
import { analyzeImport } from './duplicateDetection';
import { OptionsTransaction } from '@/types/options';

const existing: OptionsTransaction[] = [
  {
    id: '1',
    portfolioId: 'p1',
    stockSymbol: 'SOXX',
    tradeOpenDate: new Date('2026-04-21T00:00:00Z'),
    expiryDate: new Date('2028-01-21T00:00:00Z'),
    callOrPut: 'Call',
    buyOrSell: 'Buy',
    strikePrice: 350.00,
    premium: 5.00,
    numberOfContracts: 10,
    fees: 6.50,
    status: 'Open',
    breakEvenPrice: 355.00,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

test('identifies exact duplicate', () => {
  const incoming = [{
    stockSymbol: 'SOXX',
    tradeOpenDate: new Date('2026-04-21T00:00:00Z'),
    expiryDate: new Date('2028-01-21T00:00:00Z'),
    callOrPut: 'Call' as const,
    buyOrSell: 'Buy' as const,
    strikePrice: 350.00,
    premium: 5.00,
    numberOfContracts: 10
  }];

  const result = analyzeImport(incoming, existing);
  expect(result[0].dedupStatus).toBe('ExactDuplicate');
});

test('identifies linked to open', () => {
  const incoming = [{
    stockSymbol: 'SOXX',
    tradeOpenDate: new Date('2026-04-22T00:00:00Z'),
    expiryDate: new Date('2028-01-21T00:00:00Z'),
    callOrPut: 'Call' as const,
    buyOrSell: 'Sell' as const,
    strikePrice: 350.00,
    premium: 6.00,
    numberOfContracts: 10
  }];

  const result = analyzeImport(incoming, existing);
  expect(result[0].dedupStatus).toBe('LinkedToOpen');
});

test('identifies clean', () => {
  const incoming = [{
    stockSymbol: 'AAPL',
    tradeOpenDate: new Date('2026-04-21T00:00:00Z'),
    expiryDate: new Date('2026-05-21T00:00:00Z'),
    callOrPut: 'Call' as const,
    buyOrSell: 'Buy' as const,
    strikePrice: 150.00,
    premium: 5.00,
    numberOfContracts: 10
  }];

  const result = analyzeImport(incoming, existing);
  expect(result[0].dedupStatus).toBe('Clean');
});
