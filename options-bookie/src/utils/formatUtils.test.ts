import { getTransactionRowClass, formatStrikePrice, isLEAP } from './formatUtils';
import { OptionsTransaction } from '@/types/options';

describe('formatUtils', () => {
  describe('getTransactionRowClass', () => {
    it('should return correct classes for Open transactions', () => {
      const result = getTransactionRowClass('Open', false);
      expect(result).toContain('bg-blue-50/80');
      expect(result).toContain('dark:bg-blue-950/40');
    });

    it('should return correct classes for non-Open transactions', () => {
      const statuses = ['Rolled', 'Closed', 'Expired', 'Assigned'];
      statuses.forEach(status => {
        const result = getTransactionRowClass(status, false);
        expect(result).toContain('bg-gray-50');
        expect(result).toContain('dark:bg-muted/60');
      });
    });

    it('should add chain-specific classes when isChain is true', () => {
      const result = getTransactionRowClass('Open', true);
      expect(result).toContain('border-l-4');
      expect(result).toContain('border-l-blue-500');
    });
  });

  describe('formatStrikePrice', () => {
    it('should remove trailing zeros', () => {
      expect(formatStrikePrice(100.00)).toBe('100');
      expect(formatStrikePrice(100.50)).toBe('100.5');
      expect(formatStrikePrice(100.25)).toBe('100.25');
      expect(formatStrikePrice(100.10)).toBe('100.1');
    });

    it('should handle decimal places correctly', () => {
      expect(formatStrikePrice(37.00)).toBe('37');
      expect(formatStrikePrice(37.50)).toBe('37.5');
      expect(formatStrikePrice(260.00)).toBe('260');
    });
  });

  describe('isLEAP', () => {
    const createTransaction = (openDate: string, expiryDate: string): OptionsTransaction => ({
      id: '1',
      stockSymbol: 'AAPL',
      numberOfContracts: 1,
      strikePrice: 100,
      callOrPut: 'Call',
      buyOrSell: 'Buy',
      tradeOpenDate: new Date(openDate),
      expiryDate: new Date(expiryDate),
      premium: 500,
      status: 'Open',
      portfolioId: 'portfolio1',
      breakEvenPrice: 105,
      fees: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    it('should identify LEAP transactions (more than 9 months)', () => {
      const transaction = createTransaction('2025-01-01', '2026-01-15'); // ~12 months
      expect(isLEAP(transaction)).toBe(true);
    });

    it('should identify non-LEAP transactions (less than 9 months)', () => {
      const transaction = createTransaction('2025-01-01', '2025-03-15'); // ~2 months
      expect(isLEAP(transaction)).toBe(false);
    });

    it('should handle edge case around 9 months', () => {
      const transaction = createTransaction('2025-01-01', '2025-09-15'); // ~8.5 months
      expect(isLEAP(transaction)).toBe(false);

      const leapTransaction = createTransaction('2025-01-01', '2025-11-15'); // ~10.5 months
      expect(isLEAP(leapTransaction)).toBe(true);
    });
  });
});
