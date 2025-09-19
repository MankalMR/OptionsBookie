/**
 * Tests for date utilities
 * Critical for options trading app - any date bugs could affect DTE, P&L, expiry calculations
 */

import {
  dateToLocalString,
  dateToInputString,
  parseLocalDate,
  formatDisplayDate,
  formatDisplayDateShort
} from './dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('should handle Date objects correctly', () => {
      const inputDate = new Date('2025-09-18T10:00:00.000Z');
      const result = parseLocalDate(inputDate);
      expect(result).toBe(inputDate);
    });

    it('should parse YYYY-MM-DD string format correctly', () => {
      const result = parseLocalDate('2025-09-18');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(8); // 0-indexed (September)
      expect(result.getDate()).toBe(18);
    });

    it('should parse ISO date strings correctly', () => {
      const result = parseLocalDate('2025-09-18T15:30:00.000Z');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(8); // 0-indexed (September)
      expect(result.getDate()).toBe(18);
    });

    it('should handle edge cases', () => {
      expect(() => parseLocalDate('')).not.toThrow();
      expect(() => parseLocalDate('invalid')).not.toThrow();
    });
  });

  describe('dateToLocalString', () => {
    it('should convert Date to YYYY-MM-DD format', () => {
      const date = new Date(2025, 8, 18); // September 18, 2025 (month is 0-indexed)
      const result = dateToLocalString(date);
      expect(result).toBe('2025-09-18');
    });

    it('should handle string dates correctly', () => {
      const result = dateToLocalString('2025-09-18');
      expect(result).toBe('2025-09-18');
    });

    it('should handle empty inputs', () => {
      expect(dateToLocalString('')).toBe('');
    });

    it('should pad single-digit months and days with zeros', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      const result = dateToLocalString(date);
      expect(result).toBe('2025-01-05');
    });
  });

  describe('dateToInputString', () => {
    it('should convert Date to ISO date string format', () => {
      const date = new Date('2025-09-18T15:30:00.000Z');
      const result = dateToInputString(date);
      expect(result).toBe('2025-09-18');
    });

    it('should work with current date', () => {
      const now = new Date();
      const result = dateToInputString(now);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDisplayDate', () => {
    it('should format Date objects correctly', () => {
      const date = new Date(2025, 8, 18); // September 18, 2025
      const result = formatDisplayDate(date);
      expect(result).toBe('Sep 18, 2025');
    });

    it('should format string dates correctly', () => {
      const result = formatDisplayDate('2025-09-18');
      expect(result).toBe('Sep 18, 2025');
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatDisplayDate('invalid-date')).toBe('Invalid Date');
      expect(formatDisplayDate('')).toBe('Invalid Date');
    });
  });

  describe('formatDisplayDateShort', () => {
    it('should return month/day and year separately', () => {
      const result = formatDisplayDateShort('2025-09-18');
      expect(result).toEqual({
        monthDay: 'Sep 18',
        year: '2025'
      });
    });

    it('should handle Date objects', () => {
      const date = new Date(2025, 8, 18); // September 18, 2025
      const result = formatDisplayDateShort(date);
      expect(result).toEqual({
        monthDay: 'Sep 18',
        year: '2025'
      });
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatDisplayDateShort('invalid-date');
      expect(result).toEqual({
        monthDay: 'Invalid',
        year: 'Date'
      });
    });
  });

  describe('Timezone consistency', () => {
    it('should handle timezone-safe operations consistently', () => {
      const testDate = '2025-09-18';

      // All operations should work with the same logical date
      const parsed = parseLocalDate(testDate);
      const localString = dateToLocalString(parsed);
      const formatted = formatDisplayDate(localString);

      expect(localString).toBe('2025-09-18');
      expect(formatted).toBe('Sep 18, 2025');
    });

    it('should not shift dates when converting between formats', () => {
      const originalDate = '2025-09-18';

      // Round trip: string -> Date -> string should not change
      const parsed = parseLocalDate(originalDate);
      const backToString = dateToLocalString(parsed);

      expect(backToString).toBe(originalDate);
    });
  });

  describe('Options trading specific scenarios', () => {
    it('should handle expiry dates correctly', () => {
      // Common option expiry dates (third Friday of month)
      const expiryDates = [
        '2025-01-17', // January expiry
        '2025-02-21', // February expiry
        '2025-03-21', // March expiry (quarterly)
        '2025-06-20', // June expiry (quarterly)
        '2025-09-19', // September expiry (quarterly)
        '2025-12-19', // December expiry (quarterly)
      ];

      expiryDates.forEach(date => {
        expect(() => parseLocalDate(date)).not.toThrow();
        expect(formatDisplayDate(date)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(dateToLocalString(date)).toBe(date);
      });
    });

    it('should handle trade open dates consistently', () => {
      // Simulate opening trades on different days
      const tradeDates = [
        '2025-09-15', // Monday
        '2025-09-16', // Tuesday
        '2025-09-17', // Wednesday
        '2025-09-18', // Thursday
        '2025-09-19', // Friday
      ];

      tradeDates.forEach(date => {
        const parsed = parseLocalDate(date);
        const formatted = formatDisplayDate(parsed);
        const inputString = dateToInputString(parsed);

        expect(parsed).toBeInstanceOf(Date);
        expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2025$/);
        expect(inputString).toMatch(/^2025-09-\d{2}$/);
      });
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large numbers of date operations efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const date = `2025-09-${String(i % 28 + 1).padStart(2, '0')}`;
        parseLocalDate(date);
        formatDisplayDate(date);
        dateToLocalString(date);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 1000 operations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should not throw errors for any reasonable input', () => {
      const testInputs = [
        '2025-09-18',
        '2025-09-18T15:30:00.000Z',
        new Date(),
        new Date('2025-09-18'),
        '',
        'invalid',
        '2025-13-45',
        '0000-00-00',
      ];

      testInputs.forEach(input => {
        expect(() => parseLocalDate(input)).not.toThrow();
        expect(() => formatDisplayDate(input)).not.toThrow();
        expect(() => dateToLocalString(input)).not.toThrow();
        expect(() => formatDisplayDateShort(input)).not.toThrow();
      });
    });

    it('should maintain consistency across all functions', () => {
      const testDate = '2025-09-18';

      // All functions should work together consistently
      const parsed = parseLocalDate(testDate);
      const localString = dateToLocalString(parsed);
      const inputString = dateToInputString(parsed);
      const displayDate = formatDisplayDate(parsed);
      const shortDate = formatDisplayDateShort(parsed);

      expect(localString).toBe(testDate);
      expect(inputString).toBe(testDate);
      expect(displayDate).toBe('Sep 18, 2025');
      expect(shortDate.monthDay).toBe('Sep 18');
      expect(shortDate.year).toBe('2025');
    });
  });
});