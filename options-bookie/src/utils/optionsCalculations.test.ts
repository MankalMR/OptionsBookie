/**
 * @jest-environment node
 */
/**
 * Tests for options calculations
 * Critical for options trading app - any calculation bugs could affect P&L, DTE, risk management
 */

import {
  calculateDaysToExpiry,
  calculateProfitLoss,
  calculateCollateral,
  calculateRoR,
  calculateBreakEven,
  calculateDaysHeld,
  formatPnLCurrency,
  formatPnLWithArrow,
  getStrategyType,
  isTradeExpired,
  shouldUpdateTradeStatus,
  getRealizedTransactions,
  calculateTotalRealizedPnL
} from './optionsCalculations';
import { OptionsTransaction } from '@/types/options';

describe('optionsCalculations', () => {
  // Test data helpers
  const createMockTransaction = (overrides = {}): OptionsTransaction => ({
    id: 'test-id',
    stockSymbol: 'AAPL',
    tradeOpenDate: new Date('2025-01-15'),
    expiryDate: new Date('2025-02-21'),
    callOrPut: 'Call',
    buyOrSell: 'Sell',
    stockPriceCurrent: 150.50,
    breakEvenPrice: 145.75,
    strikePrice: 150.00,
    premium: 4.25,
    numberOfContracts: 2,
    fees: 1.32,
    status: 'Open',
    portfolioId: 'portfolio-1',
    createdAt: new Date('2025-01-15T12:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  });

  describe('calculateProfitLoss', () => {
    it('should calculate P&L for a closed Buy option', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Buy',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction, 6.50); // Sold for $6.50

      // (6.50 - 4.25) * 2 * 100 - 1.32 = 450 - 1.32 = 448.68
      expect(result).toBe(448.68);
    });

    it('should calculate P&L for a closed Sell option', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction, 2.75); // Bought back for $2.75

      // (4.25 - 2.75) * 2 * 100 - 1.32 = 300 - 1.32 = 298.68
      expect(result).toBe(298.68);
    });

    it('should calculate P&L for an open Buy option', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Buy',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction); // No exit price

      // -4.25 * 2 * 100 - 1.32 = -850 - 1.32 = -851.32
      expect(result).toBe(-851.32);
    });

    it('should calculate P&L for an open Sell option', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction); // No exit price

      // 4.25 * 2 * 100 - 1.32 = 850 - 1.32 = 848.68
      expect(result).toBe(848.68);
    });

    it('should handle zero exit price', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction, 0);

      // Should treat as open trade since exit price is 0
      // 4.25 * 2 * 100 - 1.32 = 848.68
      expect(result).toBe(848.68);
    });

    it('should always deduct fees', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 5.00,
        numberOfContracts: 1,
        fees: 0.66,
      });

      const result = calculateProfitLoss(transaction, 3.00);

      // (5.00 - 3.00) * 1 * 100 - 0.66 = 200 - 0.66 = 199.34
      expect(result).toBe(199.34);
    });
  });

  describe('calculateCollateral', () => {
    it('should calculate collateral for Cash-Secured Put', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
      });

      const result = calculateCollateral(transaction);

      // Strike * Contracts * 100 = 150 * 2 * 100 = 30,000
      expect(result).toBe(30000);
    });

    it('should calculate collateral for Covered Call', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
      });

      const result = calculateCollateral(transaction);

      // Strike * Contracts * 100 = 150 * 2 * 100 = 30,000
      // Note: Current implementation uses strike price, not cost basis
      expect(result).toBe(30000);
    });

    it('should calculate collateral for Long Call', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Buy',
        premium: 4.25,
        numberOfContracts: 2,
      });

      const result = calculateCollateral(transaction);

      // Premium * Contracts * 100 = 4.25 * 2 * 100 = 850
      expect(result).toBe(850);
    });

    it('should calculate collateral for Long Put', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Buy',
        premium: 3.50,
        numberOfContracts: 1,
      });

      const result = calculateCollateral(transaction);

      // Premium * Contracts * 100 = 3.50 * 1 * 100 = 350
      expect(result).toBe(350);
    });

    it('should use strike price for Covered Call collateral', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
      });

      const result = calculateCollateral(transaction);

      // Implementation uses strike price: 150 * 2 * 100 = 30,000
      expect(result).toBe(30000);
    });
  });

  describe('calculateRoR', () => {
    it('should calculate RoR correctly', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
        profitLoss: 500,
      });

      const result = calculateRoR(transaction);

      // Collateral = 150 * 2 * 100 = 30,000
      // RoR = (500 / 30000) * 100 = 1.67%
      expect(result).toBeCloseTo(1.67, 2);
    });

    it('should handle zero collateral', () => {
      const transaction = createMockTransaction({
        profitLoss: 500,
        premium: 0,
        numberOfContracts: 0,
      });

      const result = calculateRoR(transaction);

      expect(result).toBe(0);
    });

    it('should handle negative P&L', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 1,
        profitLoss: -250,
      });

      const result = calculateRoR(transaction);

      // (-250 / 15000) * 100 = -1.67% (rounded to 2 decimal places)
      expect(result).toBeCloseTo(-1.67, 2);
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even for Call option', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        strikePrice: 150.00,
        premium: 4.25,
      });

      const result = calculateBreakEven(transaction);

      // Strike + Premium = 150 + 4.25 = 154.25
      expect(result).toBe(154.25);
    });

    it('should calculate break-even for Put option', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        strikePrice: 150.00,
        premium: 4.25,
      });

      const result = calculateBreakEven(transaction);

      // Strike - Premium = 150 - 4.25 = 145.75
      expect(result).toBe(145.75);
    });
  });

  describe('calculateDaysHeld', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate days held for closed trade', () => {
      const openDate = new Date('2025-01-15');
      const closeDate = new Date('2025-01-20');

      const result = calculateDaysHeld(openDate, closeDate);

      expect(result).toBe(5);
    });

    it('should calculate days held for open trade (from open date to today)', () => {
      const openDate = new Date(2025, 0, 15); // January 15, 2025

      // Mock current date to January 18, 2025
      jest.setSystemTime(new Date(2025, 0, 18));

      const result = calculateDaysHeld(openDate);

      expect(result).toBe(3);
    });

    it('should handle string dates', () => {
      const result = calculateDaysHeld('2025-01-15', '2025-01-20');

      expect(result).toBe(5);
    });

    it('should return 0 for same day', () => {
      const date = '2025-01-15';
      const result = calculateDaysHeld(date, date);

      expect(result).toBe(0);
    });
  });

  describe('formatPnLCurrency', () => {
    it('should format positive amounts', () => {
      const result = formatPnLCurrency(1234.56);
      expect(result).toBe('$1,235');
    });

    it('should format negative amounts', () => {
      const result = formatPnLCurrency(-1234.56);
      expect(result).toBe('-$1,235');
    });

    it('should format zero', () => {
      const result = formatPnLCurrency(0);
      expect(result).toBe('$0');
    });

    it('should handle large numbers', () => {
      const result = formatPnLCurrency(1234567.89);
      expect(result).toBe('$1,234,568');
    });
  });

  describe('formatPnLWithArrow', () => {
    it('should format positive P&L with up arrow', () => {
      const result = formatPnLWithArrow(150.75);
      expect(result).toEqual({
        text: '$151',
        isPositive: true,
      });
    });

    it('should format negative P&L with down arrow', () => {
      const result = formatPnLWithArrow(-75.25);
      expect(result).toEqual({
        text: '$75',
        isPositive: false,
      });
    });

    it('should format zero P&L without arrow', () => {
      const result = formatPnLWithArrow(0);
      expect(result).toEqual({
        text: '$0',
        isPositive: true,
      });
    });
  });

  describe('getStrategyType', () => {
    it('should identify Cash-Secured Put', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Sell',
      });

      const result = getStrategyType(transaction);
      expect(result).toBe('Cash-Secured Put');
    });

    it('should identify Covered Call', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Sell',
      });

      const result = getStrategyType(transaction);
      expect(result).toBe('Covered Call');
    });

    it('should identify Long Call', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Buy',
      });

      const result = getStrategyType(transaction);
      expect(result).toBe('Long Call');
    });

    it('should identify Long Put', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Put',
        buyOrSell: 'Buy',
      });

      const result = getStrategyType(transaction);
      expect(result).toBe('Long Put');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle transactions with zero contracts', () => {
      const transaction = createMockTransaction({
        numberOfContracts: 0,
        premium: 4.25,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction);
      expect(result).toBe(-1.32); // Only fees deducted
    });

    it('should handle transactions with zero premium', () => {
      const transaction = createMockTransaction({
        premium: 0,
        numberOfContracts: 2,
        fees: 1.32,
      });

      const result = calculateProfitLoss(transaction);
      expect(result).toBe(-1.32); // Only fees deducted
    });

    it('should handle transactions with zero fees', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 4.25,
        numberOfContracts: 2,
        fees: 0,
      });

      const result = calculateProfitLoss(transaction);
      expect(result).toBe(850); // No fees deducted
    });

    it('should handle undefined profitLoss in RoR calculation', () => {
      const transaction = createMockTransaction({
        profitLoss: undefined,
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 1,
      });

      const result = calculateRoR(transaction);
      expect(result).toBe(0);
    });
  });

  describe('calculateDaysToExpiry', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent test results
      jest.useFakeTimers();
      // Use local timezone date to avoid UTC shifts
      jest.setSystemTime(new Date(2025, 8, 18)); // Thursday, Sept 18, 2025 (month is 0-indexed)
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 for same day expiry', () => {
      const result = calculateDaysToExpiry('2025-09-18'); // Today
      expect(result).toBe(0);
    });

    it('should return 1 for next day expiry', () => {
      const result = calculateDaysToExpiry('2025-09-19'); // Tomorrow (Friday)
      expect(result).toBe(1);
    });

    it('should return 2 for day after tomorrow', () => {
      const result = calculateDaysToExpiry('2025-09-20'); // Saturday
      expect(result).toBe(2);
    });

    it('should return 7 for weekly options', () => {
      const result = calculateDaysToExpiry('2025-09-25'); // Next Thursday
      expect(result).toBe(7);
    });

    it('should return 30 for monthly options', () => {
      const result = calculateDaysToExpiry('2025-10-18'); // Next month
      expect(result).toBe(30);
    });

    it('should handle Date objects correctly', () => {
      const expiryDate = new Date(2025, 8, 19); // September 19th, 2025 in local timezone
      const result = calculateDaysToExpiry(expiryDate);
      expect(result).toBe(1);
    });

    it('should handle ISO string dates', () => {
      const result = calculateDaysToExpiry('2025-09-19T15:30:00.000Z');
      expect(result).toBe(1);
    });

    it('should return 0 for past dates (expired options)', () => {
      const result = calculateDaysToExpiry('2025-09-17'); // Yesterday
      expect(result).toBe(0);
    });

    it('should handle quarterly expiries correctly', () => {
      jest.setSystemTime(new Date(2025, 8, 1)); // September 1st, 2025
      const result = calculateDaysToExpiry('2025-09-19'); // Third Friday
      expect(result).toBe(18);
    });

    it('should handle year-end expiries', () => {
      jest.setSystemTime(new Date(2025, 11, 1)); // December 1st, 2025
      const result = calculateDaysToExpiry('2025-12-31'); // New Year's Eve
      expect(result).toBe(30);
    });

    it('should handle leap year correctly', () => {
      jest.setSystemTime(new Date(2024, 1, 28)); // February 28th, 2024 (leap year)
      const result = calculateDaysToExpiry('2024-02-29'); // Leap day
      expect(result).toBe(1);
    });

    it('should handle LEAPS (long-term options)', () => {
      jest.setSystemTime(new Date(2025, 8, 18)); // September 18th, 2025
      const result = calculateDaysToExpiry('2026-09-18'); // 1 year out
      expect(result).toBe(365);
    });
  });

  describe('Edge cases and invalid inputs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 8, 18)); // September 18th, 2025
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 for empty string', () => {
      expect(calculateDaysToExpiry('')).toBe(0);
    });

    it('should return 0 for invalid date string', () => {
      expect(calculateDaysToExpiry('invalid-date')).toBe(0);
    });

    it('should return 0 for malformed date', () => {
      expect(calculateDaysToExpiry('2025-13-45')).toBe(0);
    });

    it('should return 0 for zero date', () => {
      expect(calculateDaysToExpiry('0000-00-00')).toBe(0);
    });

    it('should handle extremely old dates', () => {
      expect(calculateDaysToExpiry('1900-01-01')).toBe(0);
    });

    it('should handle extremely future dates', () => {
      const result = calculateDaysToExpiry('3000-01-01');
      expect(result).toBeGreaterThan(350000); // Far in the future (about 975 years)
    });

    it('should not return NaN for any input', () => {
      const testInputs = [
        '',
        'invalid',
        '2025-13-45',
        '0000-00-00',
        'not-a-date',
        '2025/09/18', // Wrong format
      ];

      testInputs.forEach(input => {
        const result = calculateDaysToExpiry(input);
        expect(result).not.toBeNaN();
        expect(typeof result).toBe('number');
      });
    });
  });

  describe('Timezone handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 8, 18, 23, 30)); // Late evening Sept 18th, local time
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle timezone differences consistently', () => {
      // Test that DTE calculation is consistent regardless of timezone
      const result1 = calculateDaysToExpiry('2025-09-19');
      const result2 = calculateDaysToExpiry('2025-09-19T00:00:00');
      const result3 = calculateDaysToExpiry('2025-09-19T23:59:59');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle midnight edge cases', () => {
      // Test around midnight in different timezones
      jest.setSystemTime(new Date(2025, 8, 18, 23, 59, 59, 999)); // Almost midnight Sept 18th
      const result = calculateDaysToExpiry('2025-09-19');
      expect(result).toBe(1);
    });

    it('should be consistent across different time inputs', () => {
      const testTimes = [
        '2025-09-19',
        '2025-09-19T00:00:00',
        '2025-09-19T12:00:00',
        '2025-09-19T23:59:59',
        '2025-09-19T15:30:00.000Z',
      ];

      const results = testTimes.map(time => calculateDaysToExpiry(time));

      // All should return the same DTE value
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe(1);
    });
  });

  describe('Real-world trading scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle 0DTE trades correctly', () => {
      jest.setSystemTime(new Date(2025, 8, 19, 9, 30)); // Sept 19th 9:30 AM (market open)
      const result = calculateDaysToExpiry('2025-09-19'); // Same day expiry
      expect(result).toBe(0);
    });

    it('should handle 1DTE trades correctly', () => {
      jest.setSystemTime(new Date(2025, 8, 18, 15, 30)); // Sept 18th 3:30 PM
      const result = calculateDaysToExpiry('2025-09-19'); // Friday expiry
      expect(result).toBe(1);
    });

    it('should handle Friday to Monday expiry', () => {
      jest.setSystemTime(new Date(2025, 8, 19, 16, 0)); // Sept 19th 4:00 PM (after market close)
      const result = calculateDaysToExpiry('2025-09-22'); // Monday expiry
      expect(result).toBe(3);
    });

    it('should handle monthly expiry calculation', () => {
      jest.setSystemTime(new Date(2025, 8, 1)); // September 1st, 2025
      // Third Friday of September 2025 is September 19th
      const result = calculateDaysToExpiry('2025-09-19');
      expect(result).toBe(18);
    });

    it('should handle earnings plays (weekly options)', () => {
      jest.setSystemTime(new Date(2025, 8, 15)); // September 15th, 2025
      const result = calculateDaysToExpiry('2025-09-19'); // Friday after earnings
      expect(result).toBe(4);
    });

    it('should handle iron condor expiries', () => {
      jest.setSystemTime(new Date(2025, 8, 5)); // September 5th, 2025
      const result = calculateDaysToExpiry('2025-09-19'); // Monthly expiry
      expect(result).toBe(14);
    });
  });

  describe('Performance tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 8, 18)); // September 18th, 2025
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle large numbers of calculations efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const futureDate = `2025-09-${String((i % 28) + 1).padStart(2, '0')}`;
        calculateDaysToExpiry(futureDate);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 calculations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should be consistent with repeated calls', () => {
      const testDate = '2025-09-25';
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(calculateDaysToExpiry(testDate));
      }

      // All results should be identical
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe(7);
    });

    it('should handle concurrent calculations', () => {
      const dates = [
        '2025-09-19',
        '2025-09-25',
        '2025-10-18',
        '2025-12-19',
      ];

      const results = dates.map(date => calculateDaysToExpiry(date));

      expect(results).toEqual([1, 7, 30, 92]);
    });
  });

  describe('isTradeExpired', () => {
    // Mock current date to September 19, 2025 for consistent testing
    const mockCurrentDate = new Date('2025-09-19T12:00:00Z'); // 12 PM UTC = 8 AM ET

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockCurrentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should NOT expire options before market close on expiry date', () => {
      const expiryDate = new Date('2025-09-19'); // Same day as current date
      expect(isTradeExpired(expiryDate)).toBe(false);
    });

    it('should expire options after market close on expiry date', () => {
      // Set time to 9 PM UTC (5 PM ET) - after market close
      jest.setSystemTime(new Date('2025-09-19T21:00:00Z'));
      const expiryDate = new Date('2025-09-19');
      expect(isTradeExpired(expiryDate)).toBe(true);
    });

    it('should expire options on day after expiry date', () => {
      jest.setSystemTime(new Date('2025-09-20T12:00:00Z')); // Next day
      const expiryDate = new Date('2025-09-19');
      expect(isTradeExpired(expiryDate)).toBe(true);
    });

    it('should NOT expire options before expiry date', () => {
      const expiryDate = new Date('2025-09-20'); // Tomorrow
      expect(isTradeExpired(expiryDate)).toBe(false);
    });

    it('should handle different timezones correctly', () => {
      // Test with different times on expiry date
      const expiryDate = new Date('2025-09-19');

      // 6 AM UTC (2 AM ET) - before market close
      jest.setSystemTime(new Date('2025-09-19T06:00:00Z'));
      expect(isTradeExpired(expiryDate)).toBe(false);

      // 7 PM UTC (3 PM ET) - before market close
      jest.setSystemTime(new Date('2025-09-19T19:00:00Z'));
      expect(isTradeExpired(expiryDate)).toBe(false);

      // 8 PM UTC (4 PM ET) - exactly market close
      jest.setSystemTime(new Date('2025-09-19T20:00:00Z'));
      expect(isTradeExpired(expiryDate)).toBe(false);

      // 9 PM UTC (5 PM ET) - after market close
      jest.setSystemTime(new Date('2025-09-19T21:00:00Z'));
      expect(isTradeExpired(expiryDate)).toBe(true);
    });

    it('should handle string dates', () => {
      const expiryDate = '2025-09-19';
      expect(isTradeExpired(expiryDate)).toBe(false);
    });

    it('should handle Date objects with time components', () => {
      const expiryDate = new Date('2025-09-19T15:30:00Z'); // 3:30 PM UTC
      expect(isTradeExpired(expiryDate)).toBe(false);
    });
  });

  describe('shouldUpdateTradeStatus', () => {
    it('should return true for open trades that have expired', () => {
      const transaction = createMockTransaction({
        status: 'Open',
        expiryDate: new Date('2025-09-18') // Yesterday
      });

      // Mock current time to after market close
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-09-19T21:00:00Z'));

      expect(shouldUpdateTradeStatus(transaction)).toBe(true);

      jest.useRealTimers();
    });

    it('should return false for closed trades even if expired', () => {
      const transaction = createMockTransaction({
        status: 'Closed',
        expiryDate: new Date('2025-09-18') // Yesterday
      });

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-09-19T21:00:00Z'));

      expect(shouldUpdateTradeStatus(transaction)).toBe(false);

      jest.useRealTimers();
    });

    it('should return false for open trades that have not expired', () => {
      const transaction = createMockTransaction({
        status: 'Open',
        expiryDate: new Date('2025-09-20') // Tomorrow
      });

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-09-19T12:00:00Z')); // Before expiry date

      expect(shouldUpdateTradeStatus(transaction)).toBe(false);

      jest.useRealTimers();
    });

    it('should return false for open trades on expiry date before market close', () => {
      const transaction = createMockTransaction({
        status: 'Open',
        expiryDate: new Date('2025-09-19') // Today
      });

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-09-19T12:00:00Z')); // Before market close

      expect(shouldUpdateTradeStatus(transaction)).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('getRealizedTransactions', () => {
    it('should include expired trades in realized transactions', () => {
      const transactions = [
        createMockTransaction({ status: 'Open' }),
        createMockTransaction({ status: 'Closed' }),
        createMockTransaction({ status: 'Expired' }),
        createMockTransaction({ status: 'Assigned' }),
        createMockTransaction({ status: 'Rolled' })
      ];

      const realized = getRealizedTransactions(transactions);

      expect(realized).toHaveLength(3);
      expect(realized.map(t => t.status)).toEqual(['Closed', 'Expired', 'Assigned']);
    });

    it('should exclude open and rolled trades from realized', () => {
      const transactions = [
        createMockTransaction({ status: 'Open' }),
        createMockTransaction({ status: 'Rolled' })
      ];

      const realized = getRealizedTransactions(transactions);

      expect(realized).toHaveLength(0);
    });
  });

  describe('calculateTotalRealizedPnL', () => {
    it('should include P&L from expired trades', () => {
      const transactions = [
        createMockTransaction({
          status: 'Closed',
          profitLoss: 100
        }),
        createMockTransaction({
          status: 'Expired',
          profitLoss: 250
        }),
        createMockTransaction({
          status: 'Assigned',
          profitLoss: -50
        })
      ];

      const totalPnL = calculateTotalRealizedPnL(transactions);

      expect(totalPnL).toBe(300); // 100 + 250 - 50
    });

    it('should handle transactions with undefined profitLoss', () => {
      const transactions = [
        createMockTransaction({
          status: 'Expired',
          profitLoss: undefined
        }),
        createMockTransaction({
          status: 'Closed',
          profitLoss: 100
        })
      ];

      const totalPnL = calculateTotalRealizedPnL(transactions);

      expect(totalPnL).toBe(100); // 0 + 100
    });

    it('should return 0 for empty transactions array', () => {
      const totalPnL = calculateTotalRealizedPnL([]);
      expect(totalPnL).toBe(0);
    });
  });

  describe('Expired Trade P&L Edge Cases', () => {
    it('should calculate correct P&L for expired sold options', () => {
      // Sold option that expired worthless - should keep premium received
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 4.50,
        numberOfContracts: 1,
        fees: 0.50,
        status: 'Open'
      });

      // Calculate P&L as if it expired (no exit price)
      const profitLoss = calculateProfitLoss(transaction);

      // Should be: (premium * contracts * 100) - fees
      // (4.50 * 1 * 100) - 0.50 = 450 - 0.50 = 449.50
      expect(profitLoss).toBe(449.50);
    });

    it('should calculate correct P&L for expired bought options', () => {
      // Bought option that expired worthless - should lose premium paid
      const transaction = createMockTransaction({
        buyOrSell: 'Buy',
        premium: 2.25,
        numberOfContracts: 2,
        fees: 1.00,
        status: 'Open'
      });

      const profitLoss = calculateProfitLoss(transaction);

      // Should be: (-premium * contracts * 100) - fees
      // (-2.25 * 2 * 100) - 1.00 = -450 - 1.00 = -451.00
      expect(profitLoss).toBe(-451.00);
    });

    it('should handle multiple contracts correctly for expired trades', () => {
      const transaction = createMockTransaction({
        buyOrSell: 'Sell',
        premium: 1.50,
        numberOfContracts: 10,
        fees: 2.00,
        status: 'Open'
      });

      const profitLoss = calculateProfitLoss(transaction);

      // Should be: (premium * contracts * 100) - fees
      // (1.50 * 10 * 100) - 2.00 = 1500 - 2.00 = 1498.00
      expect(profitLoss).toBe(1498.00);
    });
  });
});
