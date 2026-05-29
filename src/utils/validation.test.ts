import { validateTransactionData } from './validation';

describe('validation utils', () => {
  const validData = {
    portfolioId: 'port-123',
    stockSymbol: 'AAPL',
    tradeOpenDate: '2025-01-01',
    expiryDate: '2025-03-21',
    callOrPut: 'Call',
    buyOrSell: 'Sell',
    strikePrice: 150,
    premium: 500,
    numberOfContracts: 1,
    breakEvenPrice: 155,
    status: 'Open'
  };

  describe('validateTransactionData', () => {
    it('should return isValid true for valid data', () => {
      const result = validateTransactionData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch invalid date formats', () => {
      const invalidDates = {
        ...validData,
        tradeOpenDate: 'not-a-date',
        expiryDate: '2025-13-45', // Invalid date
        closeDate: 'invalid'
      };

      const result = validateTransactionData(invalidDates);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tradeOpenDate must be a valid date');
      expect(result.errors).toContain('expiryDate must be a valid date');
      expect(result.errors).toContain('closeDate must be a valid date');
    });

    it('should catch missing required fields when not an update', () => {
      const missingData = { ...validData };
      delete (missingData as any).stockSymbol;

      const result = validateTransactionData(missingData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: stockSymbol');
    });

    it('should not catch missing required fields when it is an update', () => {
      const missingData = { ...validData };
      delete (missingData as any).stockSymbol;

      const result = validateTransactionData(missingData, true);
      expect(result.isValid).toBe(true);
    });

    it('should validate enum values', () => {
      const invalidEnums = {
        ...validData,
        callOrPut: 'Invalid',
        buyOrSell: 'Invalid',
        status: 'Invalid'
      };

      const result = validateTransactionData(invalidEnums);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('callOrPut must be one of: Call, Put');
      expect(result.errors).toContain('buyOrSell must be one of: Buy, Sell');
      expect(result.errors).toContain('status must be one of: Open, Closed, Expired, Assigned, Rolled');
    });

    it('should validate numeric fields', () => {
      const invalidNumbers = {
        ...validData,
        strikePrice: 'not-a-number',
        premium: NaN
      };

      const result = validateTransactionData(invalidNumbers);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('strikePrice must be a valid number');
      expect(result.errors).toContain('premium must be a valid number');
    });

    it('should validate string types for IDs', () => {
      const invalidStrings = {
        ...validData,
        portfolioId: 123,
        chainId: {}
      };

      const result = validateTransactionData(invalidStrings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('portfolioId must be a string');
      expect(result.errors).toContain('chainId must be a string');
    });
  });
});
