/**
 * @jest-environment node
 */
/**
 * Tests for database-secure.ts
 * Critical for data integrity and security - any bugs could affect user data
 */

import { jest } from '@jest/globals';
import { OptionsTransaction } from '@/types/options';

// Mock Supabase client with a simpler approach
const mockSupabaseClient = {
  from: jest.fn()
};

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock environment variables before any imports
const originalEnv = process.env;

// Set environment variables before importing the module
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

beforeAll(() => {
  // Ensure environment variables are set
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

afterAll(() => {
  process.env = originalEnv;
});

// Import after mocking
import { secureDb } from './database-secure';

describe('database-secure', () => {
  const mockUserEmail = 'test@example.com';
  const mockTransaction: OptionsTransaction = {
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
  };

  const mockDbRow = {
    id: 'test-id',
    stock_symbol: 'AAPL',
    trade_open_date: '2025-01-15',
    expiry_date: '2025-02-21',
    call_or_put: 'Call',
    buy_or_sell: 'Sell',
    stock_price_current: 150.50,
    break_even_price: 145.75,
    strike_price: 150.00,
    premium: 4.25,
    number_of_contracts: 2,
    fees: 1.32,
    status: 'Open',
    user_id: 'test@example.com',
    portfolio_id: 'portfolio-1',
    created_at: '2025-01-15T12:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should fetch transactions for authenticated user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: [mockDbRow],
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransactions(mockUserEmail);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options_transactions');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(1);
      expect(result[0].stockSymbol).toBe('AAPL');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      try {
        await secureDb.getTransactions(mockUserEmail);
        fail('Expected function to throw');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return empty array when no transactions found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransactions(mockUserEmail);
      expect(result).toEqual([]);
    });
  });

  describe('getTransaction', () => {
    it('should fetch single transaction by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue({
                data: mockDbRow,
                error: null
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransaction('test-id', mockUserEmail);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options_transactions');
      expect(result).toBeDefined();
      expect(result?.stockSymbol).toBe('AAPL');
    });

    it('should return null when transaction not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue({
                data: null,
                error: { code: 'PGRST116' } // No rows found
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransaction('non-existent', mockUserEmail);
      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      try {
        await secureDb.getTransaction('test-id', mockUserEmail);
        fail('Expected function to throw');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('createTransaction', () => {
    it('should create new transaction', async () => {
      const newTransaction = {
        stockSymbol: 'MSFT',
        tradeOpenDate: new Date('2025-02-01'),
        expiryDate: new Date('2025-03-21'),
        callOrPut: 'Put' as const,
        buyOrSell: 'Buy' as const,
        stockPriceCurrent: 380.00,
        breakEvenPrice: 375.50,
        strikePrice: 380.00,
        premium: 4.50,
        numberOfContracts: 1,
        fees: 0.66,
        status: 'Open' as const,
        portfolioId: 'portfolio-2',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({
              data: { ...mockDbRow, id: 'new-id', stock_symbol: 'MSFT' },
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.createTransaction(newTransaction, mockUserEmail);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options_transactions');
      expect(result.stockSymbol).toBe('MSFT');
    });

    it('should handle creation errors', async () => {
      const newTransaction = { stockSymbol: 'MSFT' };
      const mockQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({
              data: null,
              error: { message: 'Creation failed' }
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      try {
        await secureDb.createTransaction(newTransaction, mockUserEmail);
        fail('Expected function to throw');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('updateTransaction', () => {
    it('should update existing transaction', async () => {
      const updates = { premium: 5.25, status: 'Closed' as const };
      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue({
                  data: { ...mockDbRow, premium: 5.25, status: 'Closed' },
                  error: null
                })
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.updateTransaction('test-id', updates, mockUserEmail);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options_transactions');
      expect(result.premium).toBe(5.25);
      expect(result.status).toBe('Closed');
    });

    it('should handle update errors', async () => {
      const updates = { premium: 5.25 };
      const mockQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue({
                  data: null,
                  error: { message: 'Update failed' }
                })
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      try {
        await secureDb.updateTransaction('test-id', updates, mockUserEmail);
        fail('Expected function to throw');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await secureDb.deleteTransaction('test-id', mockUserEmail);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('options_transactions');
    });

    it('should handle delete errors', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              error: { message: 'Delete failed' }
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      try {
        await secureDb.deleteTransaction('test-id', mockUserEmail);
        fail('Expected function to throw');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getStats', () => {
    it('should calculate user statistics', async () => {
      const mockStatsData = [
        { status: 'Open', profit_loss: '0' },
        { status: 'Closed', profit_loss: '100.50' },
        { status: 'Closed', profit_loss: '-50.25' },
        { status: 'Closed', profit_loss: '75.00' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: mockStatsData,
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getStats(mockUserEmail);

      expect(result.totalTrades).toBe(4);
      expect(result.openTrades).toBe(1);
      expect(result.closedTrades).toBe(3);
      expect(result.totalProfitLoss).toBe(125.25); // 100.50 - 50.25 + 75.00
      expect(result.winRate).toBeCloseTo(66.67, 1); // 2 winning trades out of 3 closed
    });

    it('should handle zero closed trades in win rate calculation', async () => {
      const mockStatsData = [
        { status: 'Open', profit_loss: '0' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: mockStatsData,
            error: null
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getStats(mockUserEmail);

      expect(result.winRate).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed date strings', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: [{
                ...mockDbRow,
                trade_open_date: 'invalid-date',
                expiry_date: '2025-02-21T00:00:00.000Z'
              }],
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransactions(mockUserEmail);
      expect(result).toHaveLength(1);
      expect(result[0].tradeOpenDate).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: [{
                ...mockDbRow,
                exit_price: null,
                close_date: null,
                fees: null
              }],
              error: null
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await secureDb.getTransactions(mockUserEmail);
      expect(result[0].exitPrice).toBeUndefined();
      expect(result[0].closeDate).toBeUndefined();
      expect(result[0].fees).toBe(0);
    });
  });
});