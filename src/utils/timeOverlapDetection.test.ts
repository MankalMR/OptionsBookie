import { dateRangesOverlap, detectTimeOverlaps, detectOverlapsByStock } from './timeOverlapDetection';
import { OptionsTransaction } from '@/types/options';

// Helper to create a mock transaction
function createTransaction(
  symbol: string,
  openDate: string,
  closeDate: string,
  strikePrice?: number,
  id?: string
): OptionsTransaction {
  return {
    id: id || `${symbol}-${openDate}`,
    stockSymbol: symbol,
    tradeOpenDate: new Date(openDate),
    closeDate: new Date(closeDate),
    status: 'Closed',
    buyOrSell: 'Sell',
    callOrPut: 'Put',
    strikePrice: strikePrice ?? 100,
    numberOfContracts: 1,
    premium: 1.0,
    fees: 0,
    profitLoss: 50,
    portfolioId: 'test-portfolio',
    createdAt: new Date(openDate),
    updatedAt: new Date(closeDate),
    stockPriceCurrent: 100,
    expiryDate: new Date(closeDate),
    breakEvenPrice: 99,
    exitPrice: 0.5
  } as unknown as OptionsTransaction;
}

describe('dateRangesOverlap', () => {
  test('detects no overlap for completely separate ranges', () => {
    const start1 = new Date('2025-09-15');
    const end1 = new Date('2025-10-20');
    const start2 = new Date('2025-10-22');
    const end2 = new Date('2025-11-15');

    expect(dateRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });

  test('detects overlap for partially overlapping ranges', () => {
    const start1 = new Date('2025-09-15');
    const end1 = new Date('2025-10-20');
    const start2 = new Date('2025-10-18'); // Overlaps by 2 days
    const end2 = new Date('2025-11-15');

    expect(dateRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });

  test('detects overlap for fully contained ranges', () => {
    const start1 = new Date('2025-09-15');
    const end1 = new Date('2025-11-15');
    const start2 = new Date('2025-10-01'); // Fully contained
    const end2 = new Date('2025-10-31');

    expect(dateRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });

  test('treats same-day close and open as sequential (no overlap)', () => {
    const start1 = new Date('2025-09-15');
    const end1 = new Date('2025-10-20');
    const start2 = new Date('2025-10-20'); // Same day
    const end2 = new Date('2025-11-15');

    expect(dateRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });

  test('detects overlap when ranges are identical', () => {
    const start1 = new Date('2025-09-15');
    const end1 = new Date('2025-10-20');
    const start2 = new Date('2025-09-15');
    const end2 = new Date('2025-10-20');

    expect(dateRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });
});

describe('detectTimeOverlaps', () => {
  test('returns no overlap for empty array', () => {
    const result = detectTimeOverlaps([]);

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingGroups).toHaveLength(0);
    expect(result.sequentialTrades).toHaveLength(0);
  });

  test('returns no overlap for single transaction', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z')
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingGroups).toHaveLength(0);
    expect(result.sequentialTrades).toHaveLength(1);
  });

  test('detects no overlap for sequential trades', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-22T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'),
      createTransaction('RGTI', '2025-11-18T05:00:00.000Z', '2025-12-01T05:00:00.000Z', 3950, 'trade3'),
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingGroups).toHaveLength(0);
    expect(result.sequentialTrades).toHaveLength(3);
  });

  test('detects overlap for two overlapping trades', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-18T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'), // Overlaps
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingGroups).toHaveLength(1);
    expect(result.overlappingGroups[0]).toHaveLength(2);
    expect(result.sequentialTrades).toHaveLength(0);
  });

  test('detects mixed sequential and overlapping trades', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-18T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'), // Overlaps with trade1
      createTransaction('RGTI', '2025-11-20T05:00:00.000Z', '2025-12-01T05:00:00.000Z', 3950, 'trade3'), // Sequential
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingGroups).toHaveLength(1);
    expect(result.overlappingGroups[0]).toHaveLength(2);
    expect(result.sequentialTrades).toHaveLength(1);
    expect(result.sequentialTrades[0].id).toBe('trade3');
  });

  test('handles three concurrent positions', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-11-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-01T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'), // Overlaps with trade1
      createTransaction('RGTI', '2025-10-10T04:00:00.000Z', '2025-11-10T05:00:00.000Z', 3950, 'trade3'), // Overlaps with both
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingGroups).toHaveLength(1);
    expect(result.overlappingGroups[0]).toHaveLength(3);
    expect(result.sequentialTrades).toHaveLength(0);
  });

  test('treats same-day close and open as sequential', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-20T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'), // Same day
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingGroups).toHaveLength(0);
    expect(result.sequentialTrades).toHaveLength(2);
  });

  test('filters out transactions without close dates', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      { ...createTransaction('RGTI', '2025-10-22T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'), closeDate: undefined },
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(false);
    expect(result.sequentialTrades).toHaveLength(1);
  });

  test('handles unsorted transactions correctly', () => {
    const transactions = [
      createTransaction('RGTI', '2025-11-18T05:00:00.000Z', '2025-12-01T05:00:00.000Z', 3950, 'trade3'),
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'trade1'),
      createTransaction('RGTI', '2025-10-22T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'trade2'),
    ];

    const result = detectTimeOverlaps(transactions);

    expect(result.hasOverlap).toBe(false);
    expect(result.sequentialTrades).toHaveLength(3);
  });
});

describe('detectOverlapsByStock', () => {
  test('detects overlaps for multiple stocks independently', () => {
    const transactions = [
      // RGTI: Sequential
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 3950, 'rgti1'),
      createTransaction('RGTI', '2025-10-22T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 3950, 'rgti2'),
      // SOFI: Overlapping
      createTransaction('SOFI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z', 1060, 'sofi1'),
      createTransaction('SOFI', '2025-10-18T04:00:00.000Z', '2025-11-15T05:00:00.000Z', 1060, 'sofi2'),
    ];

    const results = detectOverlapsByStock(transactions);

    expect(results.size).toBe(2);

    const rgtiResult = results.get('RGTI')!;
    expect(rgtiResult.hasOverlap).toBe(false);
    expect(rgtiResult.sequentialTrades).toHaveLength(2);

    const sofiResult = results.get('SOFI')!;
    expect(sofiResult.hasOverlap).toBe(true);
    expect(sofiResult.overlappingGroups).toHaveLength(1);
    expect(sofiResult.overlappingGroups[0]).toHaveLength(2);
  });

  test('handles empty array', () => {
    const results = detectOverlapsByStock([]);
    expect(results.size).toBe(0);
  });

  test('groups transactions by stock correctly', () => {
    const transactions = [
      createTransaction('RGTI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z'),
      createTransaction('SOFI', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z'),
      createTransaction('IREN', '2025-09-15T04:00:00.000Z', '2025-10-20T04:00:00.000Z'),
    ];

    const results = detectOverlapsByStock(transactions);

    expect(results.size).toBe(3);
    expect(results.has('RGTI')).toBe(true);
    expect(results.has('SOFI')).toBe(true);
    expect(results.has('IREN')).toBe(true);
  });
});

