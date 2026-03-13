/**
 * @jest-environment node
 */
// src/app/api/transactions/route.test.ts
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the dependencies before importing the route
const mockGetServerSession = jest.fn() as jest.MockedFunction<any>;
const mockSecureDb = {
  getTransactions: jest.fn() as jest.MockedFunction<any>,
  createTransaction: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/database-secure', () => ({
  secureDb: mockSecureDb,
}));

// Mock console methods to suppress logs during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('/api/transactions API routes', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockTransaction = {
    id: 'test-id',
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

  describe('GET /api/transactions', () => {
    let GET: any;

    beforeEach(async () => {
      // Dynamically import the route handler
      const routeModule = await import('./route');
      GET = routeModule.GET;
    });

    it('should return transactions for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.getTransactions.mockResolvedValue([mockTransaction]);

      const response = await GET();
      const data = await response.json();

      expect(mockGetServerSession).toHaveBeenCalled();
      expect(mockSecureDb.getTransactions).toHaveBeenCalledWith('test@example.com');
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].stockSymbol).toBe('AAPL');
      expect(data.data[0].status).toBe('Open');
      // Note: Dates are serialized as strings in JSON responses
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockSecureDb.getTransactions).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { name: 'Test User' }, // No email
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockSecureDb.getTransactions).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.getTransactions.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to fetch transactions',
      });
      expect(console.error).toHaveBeenCalledWith('Error fetching transactions:', expect.any(Error));
    });

    it('should handle empty transaction list', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.getTransactions.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle session check errors', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to fetch transactions',
      });
    });
  });

  describe('POST /api/transactions', () => {
    let POST: any;

    beforeEach(async () => {
      // Dynamically import the route handler
      const routeModule = await import('./route');
      POST = routeModule.POST;
    });

    const newTransactionData = {
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

    it('should create transaction for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.createTransaction.mockResolvedValue({
        ...newTransactionData,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockRequest = {
        json: (() => Promise.resolve(newTransactionData)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(mockGetServerSession).toHaveBeenCalled();
      expect(mockSecureDb.createTransaction).toHaveBeenCalledWith(
        newTransactionData,
        'test@example.com'
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('new-id');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const mockRequest = {
        json: (() => Promise.resolve(newTransactionData)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockSecureDb.createTransaction).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { name: 'Test User' }, // No email
      });

      const mockRequest = {
        json: (() => Promise.resolve(newTransactionData)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockSecureDb.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle database creation errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.createTransaction.mockRejectedValue(new Error('Creation failed'));

      const mockRequest = {
        json: (() => Promise.resolve(newTransactionData)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to create transaction',
      });
      expect(console.error).toHaveBeenCalledWith('Error creating transaction:', expect.any(Error));
    });

    it('should handle invalid JSON in request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockRequest = {
        json: (() => Promise.reject(new Error('Invalid JSON'))) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to create transaction',
      });
      expect(mockSecureDb.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle session check errors during POST', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const mockRequest = {
        json: (() => Promise.resolve(newTransactionData)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to create transaction',
      });
    });

    it('should pass correct transaction data structure to database', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.createTransaction.mockResolvedValue({
        ...newTransactionData,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const transactionWithExtraFields = {
        ...newTransactionData,
        extraField: 'should be ignored',
      };

      const mockRequest = {
        json: (() => Promise.resolve(transactionWithExtraFields)) as any,
      } as unknown as Request;

      const response = await POST(mockRequest);

      expect(mockSecureDb.createTransaction).toHaveBeenCalledWith(
        transactionWithExtraFields, // The API doesn't filter extra fields
        'test@example.com'
      );
      expect(response.status).toBe(200);
    });

    it('should handle required fields validation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const incompleteData = {
        stockSymbol: 'AAPL',
        // Missing required fields
      };

      const mockRequest = {
        json: (() => Promise.resolve(incompleteData)) as any,
      } as unknown as Request;

      // The database layer should handle validation
      mockSecureDb.createTransaction.mockRejectedValue(new Error('Validation error'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to create transaction',
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed session objects', async () => {
      let GET: any;
      const routeModule = await import('./route');
      GET = routeModule.GET;

      mockGetServerSession.mockResolvedValue({
        user: null, // Malformed session
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database timeout scenarios', async () => {
      let GET: any;
      const routeModule = await import('./route');
      GET = routeModule.GET;

      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.getTransactions.mockRejectedValue(new Error('Connection timeout'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch transactions');
    });

    it('should handle concurrent requests', async () => {
      let GET: any;
      const routeModule = await import('./route');
      GET = routeModule.GET;

      mockGetServerSession.mockResolvedValue(mockSession);
      mockSecureDb.getTransactions.mockResolvedValue([mockTransaction]);

      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () => GET());
      const responses = await Promise.all(promises);

      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      expect(mockSecureDb.getTransactions).toHaveBeenCalledTimes(5);
    });
  });
});
