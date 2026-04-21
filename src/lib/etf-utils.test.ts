import { calculateTopTenConcentration, formatAum, formatPercent } from './etf-utils';
import type { EtfHolding } from '@/types/etf';

describe('etf-utils', () => {
  describe('calculateTopTenConcentration', () => {
    it('returns null for null or empty holdings', () => {
      expect(calculateTopTenConcentration(null)).toBeNull();
      expect(calculateTopTenConcentration([])).toBeNull();
    });

    it('sums all weights if less than 10 items', () => {
      const holdings: EtfHolding[] = [
        { symbol: 'A', description: '', weight: 0.1 },
        { symbol: 'B', description: '', weight: 0.2 },
      ];
      expect(calculateTopTenConcentration(holdings)).toBeCloseTo(0.3);
    });

    it('sums only the first 10 items if more are provided', () => {
      const holdings: EtfHolding[] = Array(15).fill(null).map((_, i) => ({
        symbol: `S${i}`,
        description: '',
        weight: 0.1, // total 1.5 if all summed, but 1.0 if top 10
      }));
      expect(calculateTopTenConcentration(holdings)).toBeCloseTo(1.0);
    });

    it('handles missing weights as 0', () => {
      const holdings: EtfHolding[] = [
        { symbol: 'A', description: '', weight: 0.5 },
        { symbol: 'B', description: '', weight: null as any },
      ];
      expect(calculateTopTenConcentration(holdings)).toBe(0.5);
    });
  });

  describe('formatAum', () => {
    it('formats billions', () => {
      expect(formatAum(1_200_000_000)).toBe('$1.2B');
    });

    it('formats millions', () => {
      expect(formatAum(450_000_000)).toBe('$450.0M');
    });

    it('formats thousands', () => {
      expect(formatAum(50_000)).toBe('$50.0K');
    });

    it('returns N/A for null', () => {
      expect(formatAum(null)).toBe('N/A');
    });
  });

  describe('formatPercent', () => {
    it('converts decimal to percentage string', () => {
      expect(formatPercent(0.08543)).toBe('8.54%');
      expect(formatPercent(0.5)).toBe('50.00%');
    });

    it('returns N/A for null', () => {
      expect(formatPercent(null)).toBe('N/A');
    });
  });
});
