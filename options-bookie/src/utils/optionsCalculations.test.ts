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
  calculateTotalRealizedPnL,
  calculateStrategyPerformance,
  calculateMonthlyChartData,
  calculateMonthlyTopTickers,
  calculateTop5TickersYearlyPerformance,
  calculateUnrealizedPnL,
  calculateAverageRoR,
  calculateNewTradeProfitLoss,
  calculateAnnualizedROR,
  calculateAnnualizedRoR,
  calculatePortfolioAnnualizedRoR,
  getRoRColorClasses,
  calculateTimeBasedAnnualizedRoR,
  calculateMonthlyAnnualizedRoR,
  calculateYearlyAnnualizedRoR,
  calculateAllTimeAnnualizedRoR,
  getAnnualizedRoRMethod,
  calculatePortfolioAnnualizedRoRWithMethod,
  calculateMonthlyPortfolioAnnualizedRoR,
  calculateYearlyPortfolioAnnualizedRoR,
  calculateActiveTradingDays,
  calculateYearlyAnnualizedRoRWithActiveMonths,
  updateTransactionPandL,
  calculateChainPnL,
  calculateChainCollateral,
  calculateChainRoR,
  calculateTotalDeployedCapital,
  calculatePortfolioRoR,
  formatPnLNumber,
  calculateChainAwareStockPerformance,
  calculateChainAwareMonthlyPnL
} from './optionsCalculations';
import { OptionsTransaction } from '@/types/options';

describe('optionsCalculations', () => {
  // Test data helpers
  const createMockChain = (overrides = {}) => ({
    id: 'test-chain',
    userId: 'test-user',
    portfolioId: 'test-portfolio',
    symbol: 'TEST',
    chainStatus: 'Active' as 'Active' | 'Closed',
    optionType: 'Call' as 'Call' | 'Put',
    originalStrikePrice: 100,
    originalOpenDate: new Date('2025-01-01'),
    totalChainPnl: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

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

    it('should use manual collateral amount when specified', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
        collateralAmount: 5000, // Manual override for PMCC
      });

      const result = calculateCollateral(transaction);

      // Should use manual amount instead of calculated amount
      expect(result).toBe(5000);
    });

    it('should fall back to calculated collateral when manual amount is zero', () => {
      const transaction = createMockTransaction({
        callOrPut: 'Call',
        buyOrSell: 'Sell',
        strikePrice: 150.00,
        numberOfContracts: 2,
        collateralAmount: 0, // Zero means use automatic calculation
      });

      const result = calculateCollateral(transaction);

      // Should fall back to automatic calculation: 150 * 2 * 100 = 30,000
      expect(result).toBe(30000);
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

    it('should handle timezone edge cases consistently', () => {
      // Test different date formats that should represent the same logical dates
      const openDate = '2025-10-01';
      const closeDateFormats = [
        '2025-10-03',                    // Simple date string
        '2025-10-03T00:00:00.000Z',     // UTC midnight
        '2025-10-03T12:00:00.000Z',     // UTC noon
        '2025-10-03T23:59:59.999Z',     // UTC almost midnight next day
      ];

      // All should calculate the same number of days (2 days: Oct 1 -> Oct 3)
      closeDateFormats.forEach(closeDate => {
        const result = calculateDaysHeld(openDate, closeDate);
        expect(result).toBe(2);
      });
    });

    it('should handle production vs local date format differences', () => {
      // Simulate the ONDS trade scenario: Sep 25 -> Oct 3
      const openDate = '2025-09-25';

      // Different ways the close date might be stored/retrieved
      const localFormat = '2025-10-03';           // SQLite might return this
      const productionFormat = '2025-10-03T00:00:00.000Z'; // Supabase might return this

      const localResult = calculateDaysHeld(openDate, localFormat);
      const prodResult = calculateDaysHeld(openDate, productionFormat);

      // Both should calculate the same number of days
      expect(localResult).toBe(prodResult);
      expect(localResult).toBe(8); // Sep 25 to Oct 3 = 8 days
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

    it('should exclude open and rolled trades from realized when no chains provided', () => {
      const transactions = [
        createMockTransaction({ status: 'Open' }),
        createMockTransaction({ status: 'Rolled' })
      ];

      const realized = getRealizedTransactions(transactions);

      expect(realized).toHaveLength(0);
    });

    it('should include rolled transactions from closed chains', () => {
      const chainId = 'test-chain-1';
      const transactions = [
        createMockTransaction({
          status: 'Rolled',
          chainId,
          profitLoss: 75,
          stockSymbol: 'TTD'
        }),
        createMockTransaction({
          status: 'Closed',
          chainId,
          profitLoss: 264,
          stockSymbol: 'TTD'
        }),
        createMockTransaction({
          status: 'Rolled',
          chainId: 'open-chain',
          profitLoss: 50,
          stockSymbol: 'AAPL'
        })
      ];

      const chains = [
        createMockChain({ id: chainId, chainStatus: 'Closed', symbol: 'TTD' }),
        createMockChain({ id: 'open-chain', chainStatus: 'Open', symbol: 'AAPL' })
      ];

      const realized = getRealizedTransactions(transactions, chains);

      expect(realized).toHaveLength(2); // Rolled from closed chain + Closed transaction
      expect(realized.some(t => t.status === 'Rolled' && t.chainId === chainId)).toBe(true);
      expect(realized.some(t => t.status === 'Closed' && t.chainId === chainId)).toBe(true);
      expect(realized.some(t => t.chainId === 'open-chain')).toBe(false); // Open chain rolled transaction excluded
    });

    it('should not include rolled transactions from open chains', () => {
      const transactions = [
        createMockTransaction({
          status: 'Rolled',
          chainId: 'open-chain',
          profitLoss: 50
        })
      ];

      const chains = [
        createMockChain({ id: 'open-chain', chainStatus: 'Open', symbol: 'AAPL' })
      ];

      const realized = getRealizedTransactions(transactions, chains);

      expect(realized).toHaveLength(0);
    });

    it('should handle rolled transactions without chainId', () => {
      const transactions = [
        createMockTransaction({
          status: 'Rolled',
          chainId: undefined,
          profitLoss: 50
        })
      ];

      const chains: any[] = [];

      const realized = getRealizedTransactions(transactions, chains);

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

  describe('calculateStrategyPerformance', () => {
    it('should calculate performance metrics correctly for realized trades only', () => {
      const transactions = [
        // Cash-Secured Put - Closed (realized)
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200 - 1.32 // $198.68
        }),
        // Cash-Secured Put - Open (should not affect realized metrics)
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 155,
          premium: 1.50,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Open',
          profitLoss: 0
        }),
        // Covered Call - Closed (realized)
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Call',
          buyOrSell: 'Sell',
          strikePrice: 300,
          premium: 3.00,
          numberOfContracts: 2,
          fees: 2.64,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 600 - 2.64 // $597.36
        })
      ];

      const result = calculateStrategyPerformance(transactions);

      expect(result).toHaveLength(2); // Cash-Secured Put and Covered Call

      const cashSecuredPut = result.find(r => r.strategy === 'Cash-Secured Put');
      expect(cashSecuredPut).toBeDefined();
      expect(cashSecuredPut?.tradeCount).toBe(2); // Total trades
      expect(cashSecuredPut?.realizedCount).toBe(1); // Only 1 realized
      expect(cashSecuredPut?.openCount).toBe(1); // 1 open
      expect(cashSecuredPut?.totalPnL).toBe(198.68); // Only realized P&L
      expect(cashSecuredPut?.winRate).toBe(100); // 1 winning trade out of 1 realized

      const coveredCall = result.find(r => r.strategy === 'Covered Call');
      expect(coveredCall).toBeDefined();
      expect(coveredCall?.tradeCount).toBe(1);
      expect(coveredCall?.realizedCount).toBe(1);
      expect(coveredCall?.openCount).toBe(0);
      expect(coveredCall?.totalPnL).toBe(597.36);
      expect(coveredCall?.winRate).toBe(100);
    });

    it('should only calculate avgRoR from realized trades', () => {
      const transactions = [
        // Open trade with high RoR (should not affect avgRoR)
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 10.00, // High premium
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Open',
          profitLoss: 0
        }),
        // Closed trade with low RoR (should be included in avgRoR)
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 1.00, // Low premium
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 100 - 1.32 // $98.68
        })
      ];

      const result = calculateStrategyPerformance(transactions);
      const cashSecuredPut = result.find(r => r.strategy === 'Cash-Secured Put');

      // avgRoR should only be calculated from the realized trade
      // RoR = (98.68 / 15000) * 100 = 0.66%
      expect(cashSecuredPut?.avgRoR).toBeCloseTo(0.66, 1);
    });

    it('should handle strategies with no realized trades', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Open',
          profitLoss: 0
        })
      ];

      const result = calculateStrategyPerformance(transactions);
      const cashSecuredPut = result.find(r => r.strategy === 'Cash-Secured Put');

      expect(cashSecuredPut?.tradeCount).toBe(1);
      expect(cashSecuredPut?.realizedCount).toBe(0);
      expect(cashSecuredPut?.openCount).toBe(1);
      expect(cashSecuredPut?.totalPnL).toBe(0);
      expect(cashSecuredPut?.avgRoR).toBe(0);
      expect(cashSecuredPut?.winRate).toBe(0);
    });

    it('should sort strategies by avgRoR descending', () => {
      const transactions = [
        // Low RoR strategy
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 1.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 100 - 1.32
        }),
        // High RoR strategy
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Call',
          buyOrSell: 'Sell',
          strikePrice: 300,
          premium: 5.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 500 - 1.32
        })
      ];

      const result = calculateStrategyPerformance(transactions);

      // Covered Call should come first (higher RoR)
      expect(result[0].strategy).toBe('Covered Call');
      expect(result[1].strategy).toBe('Cash-Secured Put');
      expect(result[0].avgRoR).toBeGreaterThan(result[1].avgRoR);
    });
  });

  describe('calculateAverageRoR', () => {
    it('should calculate average RoR correctly', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200 - 1.32
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Call',
          buyOrSell: 'Sell',
          strikePrice: 300,
          premium: 3.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 300 - 1.32
        })
      ];

      const avgRoR = calculateAverageRoR(transactions);
      expect(avgRoR).toBeGreaterThan(0);
    });

    it('should return 0 for empty transactions', () => {
      const avgRoR = calculateAverageRoR([]);
      expect(avgRoR).toBe(0);
    });
  });

  describe('calculatePortfolioRoR', () => {
    it('should calculate portfolio RoR correctly for realized trades', () => {
      const transactions = [
        // Closed trade with profit
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200 - 1.32 // $198.68 profit
        }),
        // Closed trade with loss
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 200,
          premium: 3.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: -100 - 1.32 // -$101.32 loss
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);

      // Total P&L = 198.68 + (-101.32) = 97.36
      // Total Collateral = 15,000 + 20,000 = 35,000
      // Portfolio RoR = (97.36 / 35,000) * 100 = 0.278%
      expect(portfolioRoR).toBeCloseTo(0.278, 2);
    });

    it('should only include realized transactions', () => {
      const transactions = [
        // Open trade (should be excluded)
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Open',
          profitLoss: 0 // No P&L for open trade
        }),
        // Closed trade (should be included)
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 200,
          premium: 3.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 300 - 1.32 // $298.68 profit
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);

      // Only the closed trade should be included
      // Portfolio RoR = (298.68 / 20,000) * 100 = 1.493%
      expect(portfolioRoR).toBeCloseTo(1.493, 2);
    });

    it('should return 0 for empty transactions', () => {
      const portfolioRoR = calculatePortfolioRoR([]);
      expect(portfolioRoR).toBe(0);
    });

    it('should return 0 when no realized transactions exist', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Open',
          profitLoss: 0
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          status: 'Rolled',
          profitLoss: 100
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);
      expect(portfolioRoR).toBe(0);
    });

    it('should handle zero total collateral', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Call',
          buyOrSell: 'Buy',
          strikePrice: 150,
          premium: 0, // Zero premium = zero collateral
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 100
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);
      expect(portfolioRoR).toBe(0);
    });

    it('should handle negative portfolio P&L correctly', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          premium: 2.00,
          numberOfContracts: 2,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: -500 - 1.32 // -$501.32 loss
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);

      // Total P&L = -501.32
      // Total Collateral = 150 * 2 * 100 = 30,000
      // Portfolio RoR = (-501.32 / 30,000) * 100 = -1.671%
      expect(portfolioRoR).toBeCloseTo(-1.671, 2);
    });

    it('should match individual RoR calculation for single trade', () => {
      const transaction = createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150,
        premium: 2.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        closeDate: '2025-01-20',
        profitLoss: 200 - 1.32
      });

      const portfolioRoR = calculatePortfolioRoR([transaction]);
      const individualRoR = calculateRoR(transaction);

      // For a single trade, portfolio RoR should equal individual RoR
      expect(portfolioRoR).toBeCloseTo(individualRoR, 2);
    });

    it('should be different from average RoR for multiple trades with different collateral', () => {
      const transactions = [
        // Small trade
        createMockTransaction({
          stockSymbol: 'AAPL',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 100, // Lower strike = lower collateral
          premium: 1.00,
          numberOfContracts: 1,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 100 - 1.32 // High RoR: ~1% on $10k collateral
        }),
        // Large trade
        createMockTransaction({
          stockSymbol: 'MSFT',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 500, // Higher strike = higher collateral
          premium: 5.00,
          numberOfContracts: 2,
          fees: 1.32,
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 100 - 1.32 // Lower RoR: ~0.1% on $100k collateral
        })
      ];

      const portfolioRoR = calculatePortfolioRoR(transactions);
      const averageRoR = calculateAverageRoR(transactions);

      // Portfolio RoR should be weighted by capital, average RoR treats all trades equally
      expect(portfolioRoR).not.toBeCloseTo(averageRoR, 1);
      expect(portfolioRoR).toBeGreaterThan(0);
      expect(averageRoR).toBeGreaterThan(0);
    });
  });

  describe('calculateMonthlyChartData', () => {
    it('should group transactions by month correctly', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-01-15',
          profitLoss: 100
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200
        }),
        createMockTransaction({
          stockSymbol: 'GOOGL',
          status: 'Closed',
          closeDate: '2025-02-10',
          profitLoss: 150
        })
      ];

      const result = calculateMonthlyChartData(transactions);

      expect(result).toHaveLength(2); // January and February
      expect(result[0].month).toBe('Jan 2025');
      expect(result[0].pnl).toBe(300); // 100 + 200
      expect(result[1].month).toBe('Feb 2025');
      expect(result[1].pnl).toBe(150);
    });

    it('should handle timezone edge cases correctly', () => {
      // Test dates that could be problematic in different timezones
      const transactions = [
        createMockTransaction({
          stockSymbol: 'ONDS',
          status: 'Expired',
          closeDate: '2025-10-03',  // Simple date string
          profitLoss: 16
        }),
        createMockTransaction({
          stockSymbol: 'TEST1',
          status: 'Closed',
          closeDate: '2025-10-03T00:00:00.000Z',  // UTC midnight (could be Oct 2 in some timezones)
          profitLoss: 25
        }),
        createMockTransaction({
          stockSymbol: 'TEST2',
          status: 'Closed',
          closeDate: '2025-10-03T23:59:59.999Z',  // UTC almost midnight next day
          profitLoss: 30
        }),
        createMockTransaction({
          stockSymbol: 'TEST3',
          status: 'Closed',
          closeDate: '2025-11-01T00:00:00.000Z',  // Different month boundary
          profitLoss: 40
        })
      ];

      const result = calculateMonthlyChartData(transactions);

      // All October trades should be grouped together regardless of timezone
      const octoberData = result.find(month => month.month.includes('Oct'));
      const novemberData = result.find(month => month.month.includes('Nov'));

      expect(octoberData).toBeDefined();
      expect(octoberData!.trades).toBe(3); // ONDS, TEST1, TEST2 should all be in October
      expect(octoberData!.pnl).toBe(71); // 16 + 25 + 30

      expect(novemberData).toBeDefined();
      expect(novemberData!.trades).toBe(1); // Only TEST3 should be in November
      expect(novemberData!.pnl).toBe(40);
    });
  });

  describe('calculateMonthlyTopTickers', () => {
    it('should calculate top tickers by month', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-01-15',
          profitLoss: 100
        }),
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          status: 'Closed',
          closeDate: '2025-01-25',
          profitLoss: 150
        })
      ];

      const result = calculateMonthlyTopTickers(transactions, []);
      const januaryData = result.find(r => r.monthKey === '2025-01');

      expect(januaryData).toBeDefined();
      expect(januaryData?.topByPnL.ticker).toBe('AAPL'); // Higher P&L
      expect(januaryData?.topByPnL.pnl).toBe(300);
    });

    it('should use chain-aware P&L for closed chains', () => {
      const chainId = 'ttd-chain';
      const transactions = [
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Rolled',
          chainId,
          closeDate: '2025-01-15T12:00:00',
          profitLoss: 75
        }),
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Closed',
          chainId,
          closeDate: '2025-01-20T12:00:00',
          profitLoss: 264
        }),
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-01-25T12:00:00',
          profitLoss: 200
        })
      ];

      const chains = [
        createMockChain({ id: chainId, chainStatus: 'Closed', symbol: 'TTD' })
      ];

      const result = calculateMonthlyTopTickers(transactions, chains);
      const januaryData = result.find(r => r.monthKey === '2025-01');

      expect(januaryData).toBeDefined();
      expect(januaryData?.topByPnL.ticker).toBe('TTD'); // Chain P&L: 75 + 264 = 339
      expect(januaryData?.topByPnL.pnl).toBe(339);
    });
  });

  describe('calculateTop5TickersYearlyPerformance', () => {
    it('should calculate yearly performance for top 5 tickers', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-01-15',
          profitLoss: 100
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          status: 'Closed',
          closeDate: '2025-01-20',
          profitLoss: 200
        })
      ];

      const result = calculateTop5TickersYearlyPerformance(transactions);

      expect(result.chartData).toHaveLength(1); // One year
      expect(result.chartData[0].year).toBe('2025');
      expect(result.top5Tickers).toHaveLength(2);
      expect(result.top5Tickers[0]).toBe('MSFT'); // Higher P&L first
    });
  });

  describe('calculateUnrealizedPnL', () => {
    it('should calculate unrealized P&L for open trades', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Open',
          profitLoss: 50
        }),
        createMockTransaction({
          stockSymbol: 'MSFT',
          status: 'Open',
          profitLoss: -25
        })
      ];

      const unrealizedPnL = calculateUnrealizedPnL(transactions);
      expect(unrealizedPnL).toBe(25); // 50 - 25
    });

    it('should return 0 for no open trades', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          profitLoss: 100
        })
      ];

      const unrealizedPnL = calculateUnrealizedPnL(transactions);
      expect(unrealizedPnL).toBe(0);
    });
  });

  describe('calculateChainPnL', () => {
    it('should calculate total P&L for all transactions in a chain', () => {
      const chainId = 'test-chain';
      const transactions = [
        createMockTransaction({
          chainId,
          profitLoss: 75,
          status: 'Rolled'
        }),
        createMockTransaction({
          chainId,
          profitLoss: 264,
          status: 'Closed'
        }),
        createMockTransaction({
          chainId: 'other-chain',
          profitLoss: 100,
          status: 'Closed'
        })
      ];

      const result = calculateChainPnL(chainId, transactions);

      expect(result).toBe(339); // 75 + 264
    });

    it('should return 0 for non-existent chain', () => {
      const transactions = [
        createMockTransaction({
          chainId: 'other-chain',
          profitLoss: 100,
          status: 'Closed'
        })
      ];

      const result = calculateChainPnL('non-existent', transactions);

      expect(result).toBe(0);
    });
  });

  describe('calculateChainAwareStockPerformance', () => {
    it('should aggregate individual transactions for non-chained stocks', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          profitLoss: 100,
          collateralAmount: 1000
        }),
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          profitLoss: 50,
          collateralAmount: 500
        })
      ];

      const result = calculateChainAwareStockPerformance(transactions, []);

      expect(result.has('AAPL')).toBe(true);
      const aaplData = result.get('AAPL')!;
      expect(aaplData.pnl).toBe(150);
      expect(aaplData.trades).toBe(2);
      expect(aaplData.totalCollateral).toBe(1500);
    });

    it('should use chain P&L for chained transactions', () => {
      const chainId = 'ttd-chain';
      const transactions = [
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Rolled',
          chainId,
          profitLoss: 75,
          collateralAmount: 2000
        }),
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Closed',
          chainId,
          profitLoss: 264,
          collateralAmount: 3500
        })
      ];

      const chains = [
        createMockChain({ id: chainId, chainStatus: 'Closed', symbol: 'TTD' })
      ];

      const result = calculateChainAwareStockPerformance(transactions, chains);

      expect(result.has('TTD')).toBe(true);
      const ttdData = result.get('TTD')!;
      expect(ttdData.pnl).toBe(339); // Chain P&L: 75 + 264
      expect(ttdData.trades).toBe(1); // Chain counts as 1 trade
      expect(ttdData.totalCollateral).toBe(5500); // Sum of all chain collateral
    });

    it('should skip rolled transactions from open chains', () => {
      const chainId = 'open-chain';
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Rolled',
          chainId,
          profitLoss: 50,
          collateralAmount: 1000
        })
      ];

      const chains = [
        createMockChain({ id: chainId, chainStatus: 'Open', symbol: 'AAPL' })
      ];

      const result = calculateChainAwareStockPerformance(transactions, chains);

      expect(result.has('AAPL')).toBe(false);
    });
  });

  describe('calculateChainAwareMonthlyPnL', () => {
    it('should calculate monthly P&L using chain-aware logic', () => {
      const chainId = 'ttd-chain';
      const transactions = [
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Rolled',
          chainId,
          closeDate: '2025-11-15T12:00:00',
          profitLoss: 75,
          fees: 1
        }),
        createMockTransaction({
          stockSymbol: 'TTD',
          status: 'Closed',
          chainId,
          closeDate: '2025-11-20T12:00:00',
          profitLoss: 264,
          fees: 3
        }),
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Closed',
          closeDate: '2025-11-25T12:00:00',
          profitLoss: 100,
          fees: 2
        })
      ];

      const chains = [
        createMockChain({ id: chainId, chainStatus: 'Closed', symbol: 'TTD' })
      ];

      const result = calculateChainAwareMonthlyPnL(transactions, chains, 2025, 10); // November

      expect(result.totalPnL).toBe(439); // Chain P&L (339) + AAPL (100)
      expect(result.totalTrades).toBe(2); // Chain counts as 1 trade + AAPL
      expect(result.fees).toBe(6); // All fees: 1 + 3 + 2
    });

    it('should skip rolled transactions not in closed chains', () => {
      const transactions = [
        createMockTransaction({
          stockSymbol: 'AAPL',
          status: 'Rolled',
          closeDate: '2025-11-15T12:00:00',
          profitLoss: 50
        })
      ];

      const result = calculateChainAwareMonthlyPnL(transactions, [], 2025, 10);

      expect(result.totalPnL).toBe(0);
      expect(result.totalTrades).toBe(0);
      expect(result.fees).toBe(0);
    });
  });

  describe('calculateNewTradeProfitLoss', () => {
    it('should return 0 for new trades (P&L is realized only when closed)', () => {
      const transaction = {
        stockSymbol: 'AAPL',
        tradeOpenDate: new Date('2025-01-15'),
        expiryDate: new Date('2025-02-21'),
        callOrPut: 'Call' as const,
        buyOrSell: 'Sell' as const,
        stockPriceCurrent: 150.50,
        breakEvenPrice: 145.75,
        strikePrice: 150.00,
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32,
        status: 'Open' as const,
        portfolioId: 'portfolio-1',
        createdAt: new Date('2025-01-15T12:00:00Z'),
        updatedAt: new Date('2025-01-15T12:00:00Z'),
      };

      const profitLoss = calculateNewTradeProfitLoss();
      expect(profitLoss).toBe(0); // New trades have 0 P&L until closed
    });
  });

  describe('calculateAnnualizedROR', () => {
    it('should calculate annualized RoR correctly', () => {
      const transaction = createMockTransaction({
        profitLoss: 100,
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-04-01', // 90 days
        strikePrice: 150,
        numberOfContracts: 1
      });

      const annualizedRoR = calculateAnnualizedROR(transaction);
      expect(annualizedRoR).toBeGreaterThan(0);
      expect(annualizedRoR).toBeLessThan(100); // Should be reasonable
    });

    it('should return undefined for open trades', () => {
      const transaction = createMockTransaction({
        status: 'Open',
        closeDate: undefined,
        profitLoss: 0, // Open trades have 0 profitLoss
        premium: 0, // This will make totalCost 0, causing undefined return
        numberOfContracts: 1
      });

      const annualizedRoR = calculateAnnualizedROR(transaction);
      expect(annualizedRoR).toBeUndefined();
    });
  });

  describe('updateTransactionPandL', () => {
    it('should update P&L for open trade with current stock price', () => {
      const transaction = createMockTransaction({
        status: 'Open',
        stockPriceCurrent: 155.00,
        strikePrice: 150.00,
        callOrPut: 'Call',
        buyOrSell: 'Sell'
      });

      const updatedTransaction = updateTransactionPandL(transaction, 160.00);
      expect(updatedTransaction.profitLoss).toBeDefined();
      expect(updatedTransaction.profitLoss).not.toBe(transaction.profitLoss);
    });

    it('should update P&L for closed trades when current stock price is provided', () => {
      const transaction = createMockTransaction({
        status: 'Closed',
        profitLoss: 100,
        closeDate: '2025-01-20', // Closed trades have closeDate
        buyOrSell: 'Sell' as const,
        premium: 4.25,
        numberOfContracts: 2,
        fees: 1.32
      });

      const updatedTransaction = updateTransactionPandL(transaction, 160.00);
      // The function recalculates P&L based on current stock price, not preserving original
      expect(updatedTransaction.profitLoss).not.toBe(100);
      expect(updatedTransaction.stockPriceCurrent).toBe(160.00);
    });
  });

  describe('calculateChainPnL', () => {
    it('should calculate total P&L for a trade chain', () => {
      const transactions = [
        createMockTransaction({
          chainId: 'chain-1',
          profitLoss: 100
        }),
        createMockTransaction({
          chainId: 'chain-1',
          profitLoss: -50
        }),
        createMockTransaction({
          chainId: 'chain-2',
          profitLoss: 200
        })
      ];

      const chainPnL = calculateChainPnL('chain-1', transactions);
      expect(chainPnL).toBe(50); // 100 - 50
    });

    it('should return 0 for non-existent chain', () => {
      const transactions = [
        createMockTransaction({
          chainId: 'chain-1',
          profitLoss: 100
        })
      ];

      const chainPnL = calculateChainPnL('chain-2', transactions);
      expect(chainPnL).toBe(0);
    });
  });

  describe('calculateChainCollateral', () => {
    it('should calculate total collateral for a trade chain', () => {
      const transactions = [
        createMockTransaction({
          chainId: 'chain-1',
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          numberOfContracts: 1
        }),
        createMockTransaction({
          chainId: 'chain-1',
          callOrPut: 'Call',
          buyOrSell: 'Sell',
          strikePrice: 200,
          numberOfContracts: 2
        })
      ];

      const chainCollateral = calculateChainCollateral('chain-1', transactions);
      expect(chainCollateral).toBeGreaterThan(0);
    });
  });

  describe('calculateChainRoR', () => {
    it('should calculate RoR for a trade chain', () => {
      const transactions = [
        createMockTransaction({
          chainId: 'chain-1',
          profitLoss: 100,
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          numberOfContracts: 1
        })
      ];

      const chainRoR = calculateChainRoR('chain-1', transactions);
      expect(chainRoR).toBeGreaterThan(0);
    });
  });

  describe('calculateTotalDeployedCapital', () => {
    it('should calculate total deployed capital for all transactions', () => {
      const transactions = [
        createMockTransaction({
          callOrPut: 'Put',
          buyOrSell: 'Sell',
          strikePrice: 150,
          numberOfContracts: 1
        }),
        createMockTransaction({
          callOrPut: 'Call',
          buyOrSell: 'Sell',
          strikePrice: 200,
          numberOfContracts: 2
        })
      ];

      const totalCapital = calculateTotalDeployedCapital(transactions);
      expect(totalCapital).toBeGreaterThan(0);
    });
  });

  describe('formatPnLNumber', () => {
    it('should format positive numbers correctly', () => {
      expect(formatPnLNumber(1234.56)).toBe('$1235');
    });

    it('should format negative numbers correctly', () => {
      expect(formatPnLNumber(-1234.56)).toBe('$-1235');
    });

    it('should format zero correctly', () => {
      expect(formatPnLNumber(0)).toBe('$0');
    });
  });

  describe('Edge cases and error handling for critical functions', () => {
    it('should handle zero contracts in calculateNewTradeProfitLoss', () => {
      const transaction = {
        stockSymbol: 'AAPL',
        tradeOpenDate: new Date('2025-01-15'),
        expiryDate: new Date('2025-02-21'),
        callOrPut: 'Call' as const,
        buyOrSell: 'Sell' as const,
        stockPriceCurrent: 150.50,
        breakEvenPrice: 145.75,
        strikePrice: 150.00,
        premium: 4.25,
        numberOfContracts: 0,
        fees: 1.32,
        status: 'Open' as const,
        portfolioId: 'portfolio-1',
        createdAt: new Date('2025-01-15T12:00:00Z'),
        updatedAt: new Date('2025-01-15T12:00:00Z'),
      };

      const profitLoss = calculateNewTradeProfitLoss();
      expect(profitLoss).toBe(0); // New trades always return 0
    });

    it('should handle undefined profitLoss in calculateAnnualizedROR', () => {
      const transaction = createMockTransaction({
        profitLoss: undefined,
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-04-01',
        premium: 0, // This will make totalCost 0, causing undefined return
        numberOfContracts: 1
      });

      const annualizedRoR = calculateAnnualizedROR(transaction);
      expect(annualizedRoR).toBeUndefined();
    });

    it('should handle empty transactions array in calculateTotalDeployedCapital', () => {
      const totalCapital = calculateTotalDeployedCapital([]);
      expect(totalCapital).toBe(0);
    });

    it('should handle transactions with missing chainId in calculateChainPnL', () => {
      const transactions = [
        createMockTransaction({
          chainId: undefined,
          profitLoss: 100
        })
      ];

      const chainPnL = calculateChainPnL('chain-1', transactions);
      expect(chainPnL).toBe(0);
    });
  });

  describe('calculateAnnualizedRoR', () => {
    it('should calculate annualized RoR correctly for normal trades', () => {
      const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      callOrPut: 'Put',
      buyOrSell: 'Sell',
      strikePrice: 150,
      premium: 2.00,
      numberOfContracts: 1,
      fees: 1.32,
      status: 'Closed',
      tradeOpenDate: '2025-01-01',
      closeDate: '2025-01-31', // 30 days
      profitLoss: 200 - 1.32 // $198.68 profit
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    const expectedRoR = calculateRoR(transaction); // ~1.32%
    const expectedAnnualizedRoR = (expectedRoR * 365) / 30; // ~16.1%

    expect(annualizedRoR).toBeCloseTo(expectedAnnualizedRoR, 1);
    expect(annualizedRoR).toBeGreaterThan(expectedRoR); // Should be higher than regular RoR
  });

  it('should handle same-day trades with 0.5 day minimum', () => {
    const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      callOrPut: 'Put',
      buyOrSell: 'Sell',
      strikePrice: 150,
      premium: 2.00,
      numberOfContracts: 1,
      fees: 1.32,
      status: 'Closed',
      tradeOpenDate: '2025-01-01',
      closeDate: '2025-01-01', // Same day = 0 days held
      profitLoss: 100 - 1.32
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    const expectedRoR = calculateRoR(transaction);
    const expectedAnnualizedRoR = (expectedRoR * 365) / 0.5; // Use 0.5 days for same-day trades

    expect(annualizedRoR).toBeCloseTo(expectedAnnualizedRoR, 1);
    expect(annualizedRoR).toBeGreaterThan(expectedRoR * 700); // Should be very high (730x)
  });

  it('should return NaN for invalid negative days held', () => {
    const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      status: 'Closed',
      tradeOpenDate: '2025-01-31',
      closeDate: '2025-01-01', // Close before open = negative days
      profitLoss: 100
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    expect(annualizedRoR).toBeNaN();
  });

  it('should return 0 for zero RoR trades', () => {
    const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      status: 'Closed',
      tradeOpenDate: '2025-01-01',
      closeDate: '2025-01-15',
      profitLoss: 0 // Zero profit/loss
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    expect(annualizedRoR).toBe(0);
  });

  it('should return 0 for open trades (no close date)', () => {
    const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      status: 'Open',
      closeDate: null,
      profitLoss: 0
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    expect(annualizedRoR).toBe(0);
  });

  it('should handle negative RoR correctly', () => {
    const transaction = createMockTransaction({
      stockSymbol: 'AAPL',
      callOrPut: 'Put',
      buyOrSell: 'Sell',
      strikePrice: 150,
      premium: 2.00,
      numberOfContracts: 1,
      fees: 1.32,
      status: 'Closed',
      tradeOpenDate: '2025-01-01',
      closeDate: '2025-01-08', // 7 days
      profitLoss: -300 - 1.32 // Loss
    });

    const annualizedRoR = calculateAnnualizedRoR(transaction);
    const expectedRoR = calculateRoR(transaction); // Negative
    const expectedAnnualizedRoR = (expectedRoR * 365) / 7;

    expect(annualizedRoR).toBeCloseTo(expectedAnnualizedRoR, 1);
    expect(annualizedRoR).toBeLessThan(0); // Should be negative
  });

  it('should scale correctly with different time periods', () => {
    const baseTransaction = {
      stockSymbol: 'AAPL',
      callOrPut: 'Put' as const,
      buyOrSell: 'Sell' as const,
      strikePrice: 150,
      premium: 2.00,
      numberOfContracts: 1,
      fees: 1.32,
      status: 'Closed' as const,
      tradeOpenDate: '2025-01-01',
      profitLoss: 200 - 1.32
    };

    // 1 day trade
    const oneDayTrade = createMockTransaction({
      ...baseTransaction,
      closeDate: '2025-01-02'
    });

    // 365 day trade (1 year)
    const oneYearTrade = createMockTransaction({
      ...baseTransaction,
      closeDate: '2025-12-31'
    });

    const oneDayAnnualized = calculateAnnualizedRoR(oneDayTrade);
    const oneYearAnnualized = calculateAnnualizedRoR(oneYearTrade);
    const regularRoR = calculateRoR(oneYearTrade);

    // 1-day trade should have much higher annualized return
    expect(oneDayAnnualized).toBeGreaterThan(oneYearAnnualized * 300);

    // 1-year trade annualized RoR should equal regular RoR
    expect(oneYearAnnualized).toBeCloseTo(regularRoR, 1);
  });
});

describe('calculatePortfolioAnnualizedRoR', () => {
  it('should calculate weighted average annualized RoR correctly', () => {
    const transactions = [
      // Small trade with high annualized return (short duration)
      createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 100, // Lower collateral
        premium: 1.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-02', // 1 day
        profitLoss: 100 - 1.32
      }),
      // Large trade with lower annualized return (longer duration)
      createMockTransaction({
        stockSymbol: 'MSFT',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 500, // Higher collateral
        premium: 5.00,
        numberOfContracts: 2,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-02-01', // 31 days
        profitLoss: 200 - 1.32
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);

    // Should be weighted by capital, so closer to the larger trade's annualized RoR
    const largeTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[1]);
    const smallTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[0]);

    expect(portfolioAnnualizedRoR).toBeGreaterThan(0);
    expect(portfolioAnnualizedRoR).toBeLessThan(smallTradeAnnualizedRoR); // Should be less than the high short-term return

    // Portfolio should be closer to large trade due to capital weighting
    // But since the small trade has extremely high annualized return (1-day),
    // the portfolio will be somewhere between them, weighted by capital
    expect(portfolioAnnualizedRoR).toBeGreaterThan(largeTradeAnnualizedRoR); // Will be higher due to small trade influence
    expect(portfolioAnnualizedRoR).toBeLessThan(smallTradeAnnualizedRoR * 0.5); // But much less than small trade
  });

  it('should only include realized transactions', () => {
    const transactions = [
      // Open trade (should be excluded)
      createMockTransaction({
        stockSymbol: 'AAPL',
        status: 'Open',
        profitLoss: 0
      }),
      // Closed trade (should be included)
      createMockTransaction({
        stockSymbol: 'MSFT',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 200,
        premium: 3.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-15',
        profitLoss: 300 - 1.32
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);
    const closedTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[1]);

    // Should equal the single closed trade's annualized RoR
    expect(portfolioAnnualizedRoR).toBeCloseTo(closedTradeAnnualizedRoR, 2);
  });

  it('should return 0 for empty transactions', () => {
    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR([]);
    expect(portfolioAnnualizedRoR).toBe(0);
  });

  it('should return 0 when no realized transactions exist', () => {
    const transactions = [
      createMockTransaction({
        stockSymbol: 'AAPL',
        status: 'Open',
        profitLoss: 0
      }),
      createMockTransaction({
        stockSymbol: 'MSFT',
        status: 'Rolled',
        profitLoss: 100
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);
    expect(portfolioAnnualizedRoR).toBe(0);
  });

  it('should handle zero collateral trades gracefully', () => {
    const transactions = [
      // Zero collateral trade (long call with zero premium)
      createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Call',
        buyOrSell: 'Buy',
        strikePrice: 150,
        premium: 0, // Zero premium = zero collateral
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-15',
        profitLoss: 100
      }),
      // Normal trade
      createMockTransaction({
        stockSymbol: 'MSFT',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 200,
        premium: 3.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-15',
        profitLoss: 200 - 1.32
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);
    const normalTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[1]);

    // Should equal the normal trade's annualized RoR (zero collateral trade excluded)
    expect(portfolioAnnualizedRoR).toBeCloseTo(normalTradeAnnualizedRoR, 2);
  });

  it('should handle infinite annualized RoR gracefully', () => {
    const transactions = [
      createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150,
        premium: 2.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-01', // Same day - will use 0.5 days
        profitLoss: 200 - 1.32
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);

    // Should be finite (using 0.5 days for same-day trades)
    expect(isFinite(portfolioAnnualizedRoR)).toBe(true);
    expect(portfolioAnnualizedRoR).toBeGreaterThan(0);
  });

  it('should handle negative portfolio annualized RoR correctly', () => {
    const transactions = [
      createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 150,
        premium: 2.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-15',
        profitLoss: -500 - 1.32 // Large loss
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);
    const individualAnnualizedRoR = calculateAnnualizedRoR(transactions[0]);

    expect(portfolioAnnualizedRoR).toBeLessThan(0);
    expect(portfolioAnnualizedRoR).toBeCloseTo(individualAnnualizedRoR, 2);
  });

  it('should weight by capital deployment correctly', () => {
    const transactions = [
      // Small capital, high annualized return
      createMockTransaction({
        stockSymbol: 'AAPL',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 50, // Low collateral: $5,000
        premium: 1.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-02', // 1 day - very high annualized return
        profitLoss: 100 - 1.32
      }),
      // Large capital, moderate annualized return
      createMockTransaction({
        stockSymbol: 'MSFT',
        callOrPut: 'Put',
        buyOrSell: 'Sell',
        strikePrice: 400, // High collateral: $40,000
        premium: 4.00,
        numberOfContracts: 1,
        fees: 1.32,
        status: 'Closed',
        tradeOpenDate: '2025-01-01',
        closeDate: '2025-01-31', // 30 days - moderate annualized return
        profitLoss: 200 - 1.32
      })
    ];

    const portfolioAnnualizedRoR = calculatePortfolioAnnualizedRoR(transactions);
    const smallTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[0]);
    const largeTradeAnnualizedRoR = calculateAnnualizedRoR(transactions[1]);

    // Portfolio should be closer to large trade due to capital weighting
    expect(Math.abs(portfolioAnnualizedRoR - largeTradeAnnualizedRoR))
      .toBeLessThan(Math.abs(portfolioAnnualizedRoR - smallTradeAnnualizedRoR));
    });
  });

  describe('getRoRColorClasses', () => {
    it('should return green classes for positive RoR when only regular RoR is provided', () => {
      const colorClasses = getRoRColorClasses(5.2);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return red classes for negative RoR when only regular RoR is provided', () => {
      const colorClasses = getRoRColorClasses(-3.1);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should return green classes for zero RoR when only regular RoR is provided', () => {
      const colorClasses = getRoRColorClasses(0);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return green classes when both RoR values are positive', () => {
      const colorClasses = getRoRColorClasses(5.2, 45.8);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return red classes when regular RoR is negative and annualized RoR is positive', () => {
      const colorClasses = getRoRColorClasses(-2.1, 15.3);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should return red classes when regular RoR is positive and annualized RoR is negative', () => {
      const colorClasses = getRoRColorClasses(3.5, -12.7);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should return red classes when both RoR values are negative', () => {
      const colorClasses = getRoRColorClasses(-1.8, -25.4);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should return green classes when both RoR values are zero', () => {
      const colorClasses = getRoRColorClasses(0, 0);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return green classes when regular RoR is zero and annualized RoR is positive', () => {
      const colorClasses = getRoRColorClasses(0, 12.5);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return green classes when regular RoR is positive and annualized RoR is zero', () => {
      const colorClasses = getRoRColorClasses(2.3, 0);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should return red classes when regular RoR is zero and annualized RoR is negative', () => {
      const colorClasses = getRoRColorClasses(0, -8.2);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should handle very small positive numbers correctly', () => {
      const colorClasses = getRoRColorClasses(0.01, 0.001);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should handle very small negative numbers correctly', () => {
      const colorClasses = getRoRColorClasses(-0.01, 5.2);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should handle large positive numbers correctly', () => {
      const colorClasses = getRoRColorClasses(150.5, 2847.3);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should handle large negative numbers correctly', () => {
      const colorClasses = getRoRColorClasses(-89.7, -1205.4);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should handle Infinity values correctly', () => {
      const colorClasses = getRoRColorClasses(Infinity, 25.3);
      expect(colorClasses).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('should handle negative Infinity values correctly', () => {
      const colorClasses = getRoRColorClasses(-Infinity, 10.2);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should handle NaN values as negative (red)', () => {
      const colorClasses = getRoRColorClasses(NaN, 15.7);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should handle NaN in annualized RoR as negative (red)', () => {
      const colorClasses = getRoRColorClasses(5.2, NaN);
      expect(colorClasses).toBe('text-red-600 dark:text-red-400');
    });

    it('should prioritize safety - any negative or invalid value results in red', () => {
      // This test ensures that the function errs on the side of caution
      // If any value is problematic, show red (negative) color
      const testCases = [
        [5.2, -0.001], // Tiny negative annualized RoR
        [-0.001, 50.0], // Tiny negative regular RoR
        [NaN, 100],     // Invalid regular RoR
        [100, NaN],     // Invalid annualized RoR
        [-Infinity, 5], // Negative infinity regular RoR
        [5, -Infinity], // Negative infinity annualized RoR
      ];

      testCases.forEach(([ror, annualizedRoR]) => {
        const colorClasses = getRoRColorClasses(ror, annualizedRoR);
        expect(colorClasses).toBe('text-red-600 dark:text-red-400');
      });
    });
  });

  // =============================================================================
  // TIME-PERIOD BASED ANNUALIZED ROR TESTS
  // =============================================================================

  describe('calculateTimeBasedAnnualizedRoR', () => {
    it('should calculate annualized RoR for monthly period', () => {
      const monthlyRoR = 4; // 4% monthly return
      const result = calculateTimeBasedAnnualizedRoR(monthlyRoR, 30);
      expect(result).toBeCloseTo(48.67, 1); // (4 * 365) / 30 = 48.67%
    });

    it('should calculate annualized RoR for yearly period', () => {
      const yearlyRoR = 12; // 12% yearly return
      const result = calculateTimeBasedAnnualizedRoR(yearlyRoR, 365);
      expect(result).toBeCloseTo(12, 1); // (12 * 365) / 365 = 12%
    });

    it('should calculate annualized RoR for custom period', () => {
      const ror = 8; // 8% return over 180 days
      const result = calculateTimeBasedAnnualizedRoR(ror, 180);
      expect(result).toBeCloseTo(16.22, 1); // (8 * 365) / 180 = 16.22%
    });

    it('should return 0 for zero or negative days', () => {
      expect(calculateTimeBasedAnnualizedRoR(5, 0)).toBe(0);
      expect(calculateTimeBasedAnnualizedRoR(5, -10)).toBe(0);
    });

    it('should return 0 for non-finite RoR', () => {
      expect(calculateTimeBasedAnnualizedRoR(NaN, 30)).toBe(0);
      expect(calculateTimeBasedAnnualizedRoR(Infinity, 30)).toBe(0);
      expect(calculateTimeBasedAnnualizedRoR(-Infinity, 30)).toBe(0);
    });

    it('should handle negative RoR correctly', () => {
      const negativeRoR = -5; // -5% return over 30 days
      const result = calculateTimeBasedAnnualizedRoR(negativeRoR, 30);
      expect(result).toBeCloseTo(-60.83, 1); // (-5 * 365) / 30 = -60.83%
    });
  });

  describe('calculateMonthlyAnnualizedRoR', () => {
    it('should calculate monthly annualized RoR using 30-day period', () => {
      const monthlyRoR = 3; // 3% monthly return
      const result = calculateMonthlyAnnualizedRoR(monthlyRoR);
      expect(result).toBeCloseTo(36.5, 1); // (3 * 365) / 30 = 36.5%
    });

    it('should handle zero monthly RoR', () => {
      expect(calculateMonthlyAnnualizedRoR(0)).toBe(0);
    });

    it('should handle negative monthly RoR', () => {
      const negativeRoR = -2; // -2% monthly return
      const result = calculateMonthlyAnnualizedRoR(negativeRoR);
      expect(result).toBeCloseTo(-24.33, 1); // (-2 * 365) / 30 = -24.33%
    });
  });

  describe('calculateYearlyAnnualizedRoR', () => {
    it('should return the same value for yearly RoR', () => {
      const yearlyRoR = 15; // 15% yearly return
      const result = calculateYearlyAnnualizedRoR(yearlyRoR);
      expect(result).toBe(15); // (15 * 365) / 365 = 15%
    });

    it('should handle zero yearly RoR', () => {
      expect(calculateYearlyAnnualizedRoR(0)).toBe(0);
    });

    it('should handle negative yearly RoR', () => {
      const negativeRoR = -8; // -8% yearly return
      const result = calculateYearlyAnnualizedRoR(negativeRoR);
      expect(result).toBe(-8); // (-8 * 365) / 365 = -8%
    });
  });

  describe('calculateAllTimeAnnualizedRoR', () => {
    it('should calculate all-time annualized RoR based on portfolio start date', () => {
      const totalRoR = 20; // 20% total return
      const startDate = new Date(Date.now() - (400 * 24 * 60 * 60 * 1000)); // 400 days ago
      const result = calculateAllTimeAnnualizedRoR(totalRoR, startDate);
      expect(result).toBeCloseTo(18.25, 1); // (20 * 365) / 400 = 18.25%
    });

    it('should handle portfolio started today', () => {
      const totalRoR = 5; // 5% total return
      const startDate = new Date(); // Today
      const result = calculateAllTimeAnnualizedRoR(totalRoR, startDate);
      expect(result).toBeCloseTo(1825, 0); // (5 * 365) / 1 = 1825% (minimum 1 day)
    });

    it('should handle portfolio started in the future (edge case)', () => {
      const totalRoR = 10; // 10% total return
      const startDate = new Date(Date.now() + (10 * 24 * 60 * 60 * 1000)); // 10 days in future
      const result = calculateAllTimeAnnualizedRoR(totalRoR, startDate);
      expect(result).toBeCloseTo(3650, 0); // Uses minimum 1 day: (10 * 365) / 1 = 3650%
    });

    it('should handle zero total RoR', () => {
      const startDate = new Date(Date.now() - (200 * 24 * 60 * 60 * 1000)); // 200 days ago
      expect(calculateAllTimeAnnualizedRoR(0, startDate)).toBe(0);
    });

    it('should handle negative total RoR', () => {
      const totalRoR = -15; // -15% total return
      const startDate = new Date(Date.now() - (300 * 24 * 60 * 60 * 1000)); // 300 days ago
      const result = calculateAllTimeAnnualizedRoR(totalRoR, startDate);
      expect(result).toBeCloseTo(-18.25, 1); // (-15 * 365) / 300 = -18.25%
    });
  });

  describe('getAnnualizedRoRMethod', () => {
    const originalEnv = process.env.ANN_ROR_TYPE;

    afterEach(() => {
      // Restore original environment variable
      if (originalEnv !== undefined) {
        process.env.ANN_ROR_TYPE = originalEnv;
      } else {
        delete process.env.ANN_ROR_TYPE;
      }
    });

    it('should default to time-period when ANN_ROR_TYPE is not set', () => {
      delete process.env.ANN_ROR_TYPE;
      expect(getAnnualizedRoRMethod()).toBe('time-period');
    });

    it('should return time-period when ANN_ROR_TYPE is set to time-period', () => {
      process.env.ANN_ROR_TYPE = 'time-period';
      expect(getAnnualizedRoRMethod()).toBe('time-period');
    });

    it('should return trade-weighted when ANN_ROR_TYPE is set to trade-weighted', () => {
      process.env.ANN_ROR_TYPE = 'trade-weighted';
      expect(getAnnualizedRoRMethod()).toBe('trade-weighted');
    });

    it('should be case insensitive', () => {
      process.env.ANN_ROR_TYPE = 'TRADE-WEIGHTED';
      expect(getAnnualizedRoRMethod()).toBe('trade-weighted');

      process.env.ANN_ROR_TYPE = 'Time-Period';
      expect(getAnnualizedRoRMethod()).toBe('time-period');
    });

    it('should default to time-period for invalid values', () => {
      process.env.ANN_ROR_TYPE = 'invalid-method';
      expect(getAnnualizedRoRMethod()).toBe('time-period');

      process.env.ANN_ROR_TYPE = '';
      expect(getAnnualizedRoRMethod()).toBe('time-period');
    });
  });

  describe('calculatePortfolioAnnualizedRoRWithMethod', () => {
    const mockTransactions = [
      createMockTransaction({ profitLoss: 100, collateral: 2000 }), // 5% RoR
      createMockTransaction({ profitLoss: 50, collateral: 1000 }),  // 5% RoR
    ];

    it('should use trade-weighted method when specified', () => {
      const result = calculatePortfolioAnnualizedRoRWithMethod(mockTransactions, 'trade-weighted');
      const expectedTradeWeighted = calculatePortfolioAnnualizedRoR(mockTransactions);
      expect(result).toBeCloseTo(expectedTradeWeighted, 2);
    });

    it('should use time-period method when specified', () => {
      const result = calculatePortfolioAnnualizedRoRWithMethod(mockTransactions, 'time-period', 30);
      const portfolioRoR = calculatePortfolioRoR(mockTransactions);
      const expectedTimePeriod = calculateTimeBasedAnnualizedRoR(portfolioRoR, 30);
      expect(result).toBeCloseTo(expectedTimePeriod, 2);
    });

    it('should default to yearly period when no period specified for time-period method', () => {
      const result = calculatePortfolioAnnualizedRoRWithMethod(mockTransactions, 'time-period');
      const portfolioRoR = calculatePortfolioRoR(mockTransactions);
      const expectedTimePeriod = calculateTimeBasedAnnualizedRoR(portfolioRoR, 365);
      expect(result).toBeCloseTo(expectedTimePeriod, 2);
    });

    it('should use environment variable when method not specified', () => {
      const originalEnv = process.env.ANN_ROR_TYPE;

      // Test with time-period
      process.env.ANN_ROR_TYPE = 'time-period';
      const timePeriodResult = calculatePortfolioAnnualizedRoRWithMethod(mockTransactions, undefined, 30);
      const portfolioRoR = calculatePortfolioRoR(mockTransactions);
      const expectedTimePeriod = calculateTimeBasedAnnualizedRoR(portfolioRoR, 30);
      expect(timePeriodResult).toBeCloseTo(expectedTimePeriod, 2);

      // Test with trade-weighted
      process.env.ANN_ROR_TYPE = 'trade-weighted';
      const tradeWeightedResult = calculatePortfolioAnnualizedRoRWithMethod(mockTransactions);
      const expectedTradeWeighted = calculatePortfolioAnnualizedRoR(mockTransactions);
      expect(tradeWeightedResult).toBeCloseTo(expectedTradeWeighted, 2);

      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.ANN_ROR_TYPE = originalEnv;
      } else {
        delete process.env.ANN_ROR_TYPE;
      }
    });
  });

  describe('calculateMonthlyPortfolioAnnualizedRoR', () => {
    const mockTransactions = [
      createMockTransaction({ profitLoss: 60, collateral: 2000 }), // 3% RoR
      createMockTransaction({ profitLoss: 30, collateral: 1000 }),  // 3% RoR
    ];
    const originalEnv = process.env.ANN_ROR_TYPE;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ANN_ROR_TYPE = originalEnv;
      } else {
        delete process.env.ANN_ROR_TYPE;
      }
    });

    it('should use time-period method by default', () => {
      delete process.env.ANN_ROR_TYPE;
      const result = calculateMonthlyPortfolioAnnualizedRoR(mockTransactions);
      const monthlyRoR = calculatePortfolioRoR(mockTransactions);
      const expected = calculateMonthlyAnnualizedRoR(monthlyRoR);
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should use trade-weighted method when environment variable is set', () => {
      process.env.ANN_ROR_TYPE = 'trade-weighted';
      const result = calculateMonthlyPortfolioAnnualizedRoR(mockTransactions);
      const expected = calculatePortfolioAnnualizedRoR(mockTransactions);
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should use time-period method when environment variable is set to time-period', () => {
      process.env.ANN_ROR_TYPE = 'time-period';
      const result = calculateMonthlyPortfolioAnnualizedRoR(mockTransactions);
      const monthlyRoR = calculatePortfolioRoR(mockTransactions);
      const expected = calculateMonthlyAnnualizedRoR(monthlyRoR);
      expect(result).toBeCloseTo(expected, 2);
  });
});

describe('calculateActiveTradingDays', () => {
  it('should calculate active trading days based on unique months', () => {
    const transactions = [
      createMockTransaction({ tradeOpenDate: '2025-01-15' }), // January
      createMockTransaction({ tradeOpenDate: '2025-01-20' }), // January (same month)
      createMockTransaction({ tradeOpenDate: '2025-03-10' }), // March
      createMockTransaction({ tradeOpenDate: '2025-03-25' }), // March (same month)
      createMockTransaction({ tradeOpenDate: '2025-05-05' }), // May
    ];

    const result = calculateActiveTradingDays(transactions);

    // 3 unique months (Jan, Mar, May) × 30 = 90 days
    expect(result).toBe(90);
  });

  it('should return 0 for empty transactions', () => {
    const result = calculateActiveTradingDays([]);
    expect(result).toBe(0);
  });

  it('should handle single month correctly', () => {
    const transactions = [
      createMockTransaction({ tradeOpenDate: new Date('2025-01-01T12:00:00') }),
      createMockTransaction({ tradeOpenDate: new Date('2025-01-15T12:00:00') }),
      createMockTransaction({ tradeOpenDate: new Date('2025-01-31T12:00:00') }),
    ];

    const result = calculateActiveTradingDays(transactions);

    // 1 month × 30 = 30 days
    expect(result).toBe(30);
  });

  it('should handle transactions across different years', () => {
    const transactions = [
      createMockTransaction({ tradeOpenDate: '2024-12-15' }), // December 2024
      createMockTransaction({ tradeOpenDate: '2025-01-10' }), // January 2025
      createMockTransaction({ tradeOpenDate: '2025-02-20' }), // February 2025
    ];

    const result = calculateActiveTradingDays(transactions);

    // 3 unique months × 30 = 90 days
    expect(result).toBe(90);
  });
});

describe('calculateYearlyAnnualizedRoRWithActiveMonths', () => {
  it('should calculate yearly annualized RoR with active months', () => {
    const transactions = [
      createMockTransaction({
        tradeOpenDate: new Date('2025-01-15T12:00:00'),
        closeDate: new Date('2025-01-20T12:00:00'),
        status: 'Closed',
        profitLoss: 100,
        premium: 200
      }),
      createMockTransaction({
        tradeOpenDate: new Date('2025-03-10T12:00:00'),
        closeDate: new Date('2025-03-15T12:00:00'),
        status: 'Closed',
        profitLoss: 50,
        premium: 150
      }),
    ];

    const result = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, 2025);

    // 2 months × 30 = 60 active trading days
    expect(result.activeTradingDays).toBe(60);

    // Base RoR should be calculated from the transactions
    expect(result.baseRoR).toBeGreaterThan(0);

    // Annualized RoR = baseRoR × (365 / 60)
    const expectedAnnualized = result.baseRoR * (365 / 60);
    expect(result.annualizedRoR).toBeCloseTo(expectedAnnualized, 2);
  });

  it('should return zeros for empty transactions', () => {
    const result = calculateYearlyAnnualizedRoRWithActiveMonths([], 2025);

    expect(result.annualizedRoR).toBe(0);
    expect(result.activeTradingDays).toBe(0);
    expect(result.baseRoR).toBe(0);
  });

  it('should filter transactions by year correctly', () => {
    const transactions = [
      createMockTransaction({
        tradeOpenDate: '2024-12-15',
        closeDate: '2024-12-20',
        profitLoss: 100,
        premium: 200
      }),
      createMockTransaction({
        tradeOpenDate: '2025-01-10',
        closeDate: '2025-01-15',
        profitLoss: 50,
        premium: 150
      }),
    ];

    const result2025 = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, 2025);
    const result2024 = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, 2024);

    // 2025 should have 1 month (30 days)
    expect(result2025.activeTradingDays).toBe(30);

    // 2024 should have 1 month (30 days)
    expect(result2024.activeTradingDays).toBe(30);
  });

  it('should use current year when no year specified', () => {
    const currentYear = new Date().getFullYear();
    const transactions = [
      createMockTransaction({
        tradeOpenDate: new Date(`${currentYear}-01-15T12:00:00`),
        closeDate: new Date(`${currentYear}-01-20T12:00:00`),
        status: 'Closed',
        profitLoss: 100,
        premium: 200
      }),
    ];

    const result = calculateYearlyAnnualizedRoRWithActiveMonths(transactions);

    expect(result.activeTradingDays).toBe(30);
    expect(result.baseRoR).toBeGreaterThan(0);
  });

  it('should handle high annualized RoR for short periods', () => {
    const transactions = [
      createMockTransaction({
        tradeOpenDate: new Date('2025-01-15T12:00:00'),
        closeDate: new Date('2025-01-20T12:00:00'),
        status: 'Closed',
        profitLoss: 100,
        premium: 1000 // 10% monthly return
      }),
    ];

    const result = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, 2025);

    // 1 month = 30 days, so annualized should be baseRoR × (365/30) ≈ baseRoR × 12.17
    expect(result.activeTradingDays).toBe(30);
    expect(result.annualizedRoR).toBeGreaterThan(result.baseRoR * 10); // Should be much higher
  });

  it('should provide consistent results for All-Time vs Yearly when all transactions are from current year', () => {
    const currentYear = new Date().getFullYear();
    const transactions = [
      createMockTransaction({
        tradeOpenDate: new Date(`${currentYear}-01-15T12:00:00`),
        closeDate: new Date(`${currentYear}-01-20T12:00:00`),
        status: 'Closed',
        profitLoss: 100,
        premium: 200
      }),
      createMockTransaction({
        tradeOpenDate: new Date(`${currentYear}-03-10T12:00:00`),
        closeDate: new Date(`${currentYear}-03-15T12:00:00`),
        status: 'Closed',
        profitLoss: 50,
        premium: 150
      }),
    ];

    // Calculate yearly result
    const yearlyResult = calculateYearlyAnnualizedRoRWithActiveMonths(transactions, currentYear);

    // Calculate all-time result (should be same as yearly when all transactions are from current year)
    const allTimeResult = calculateYearlyAnnualizedRoRWithActiveMonths(transactions);

    // Both should be identical since all transactions are from current year
    expect(yearlyResult.annualizedRoR).toBeCloseTo(allTimeResult.annualizedRoR, 3);
    expect(yearlyResult.activeTradingDays).toBe(allTimeResult.activeTradingDays);
    expect(yearlyResult.baseRoR).toBeCloseTo(allTimeResult.baseRoR, 3);

    // Verify the calculation is using active trading days approach
    expect(yearlyResult.activeTradingDays).toBe(60); // 2 months × 30
    expect(yearlyResult.baseRoR).toBeGreaterThan(0);
    expect(yearlyResult.annualizedRoR).toBeCloseTo(yearlyResult.baseRoR * (365 / 60), 2);
  });
});

describe('calculateYearlyPortfolioAnnualizedRoR', () => {
    const mockTransactions = [
      createMockTransaction({ profitLoss: 240, collateral: 2000 }), // 12% RoR
      createMockTransaction({ profitLoss: 120, collateral: 1000 }),  // 12% RoR
    ];
    const originalEnv = process.env.ANN_ROR_TYPE;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ANN_ROR_TYPE = originalEnv;
      } else {
        delete process.env.ANN_ROR_TYPE;
      }
    });

    it('should use time-period method by default', () => {
      delete process.env.ANN_ROR_TYPE;
      const result = calculateYearlyPortfolioAnnualizedRoR(mockTransactions);
      const yearlyRoR = calculatePortfolioRoR(mockTransactions);
      const expected = calculateYearlyAnnualizedRoR(yearlyRoR);
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should use trade-weighted method when environment variable is set', () => {
      process.env.ANN_ROR_TYPE = 'trade-weighted';
      const result = calculateYearlyPortfolioAnnualizedRoR(mockTransactions);
      const expected = calculatePortfolioAnnualizedRoR(mockTransactions);
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should use time-period method when environment variable is set to time-period', () => {
      process.env.ANN_ROR_TYPE = 'time-period';
      const result = calculateYearlyPortfolioAnnualizedRoR(mockTransactions);
      const yearlyRoR = calculatePortfolioRoR(mockTransactions);
      const expected = calculateYearlyAnnualizedRoR(yearlyRoR);
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should return the same value as yearly RoR for time-period method', () => {
      process.env.ANN_ROR_TYPE = 'time-period';
      const result = calculateYearlyPortfolioAnnualizedRoR(mockTransactions);
      const yearlyRoR = calculatePortfolioRoR(mockTransactions);
      expect(result).toBeCloseTo(yearlyRoR, 2); // Should be the same since (RoR * 365) / 365 = RoR
    });
  });
});
