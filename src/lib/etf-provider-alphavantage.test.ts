import { AlphaVantageEtfProvider } from './etf-provider-alphavantage';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('AlphaVantageEtfProvider', () => {
  let provider: AlphaVantageEtfProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    process.env = { ...originalEnv, ALPHA_VANTAGE_KEY: 'test-api-key' };
    provider = new AlphaVantageEtfProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockEtfProfileResponse = {
    net_assets: '365600000000',
    net_expense_ratio: '0.0020',
    portfolio_turnover: '0.08',
    dividend_yield: '0.0048',
    inception_date: '1999-03-10',
    leveraged: 'NO',
    holdings: [
      { symbol: 'NVDA', description: 'NVIDIA CORP', weight: '0.0943' },
      { symbol: 'MSFT', description: 'MICROSOFT CORP', weight: '0.0836' },
      { symbol: 'AAPL', description: 'APPLE INC', weight: '0.0786' },
    ],
    sectors: [
      { sector: 'Information Technology', weight: '0.517' },
      { sector: 'Communication Services', weight: '0.164' },
    ],
  };

  describe('getEtfProfile', () => {
    it('should return null when API key is not configured', async () => {
      process.env.ALPHA_VANTAGE_KEY = '';
      const noKeyProvider = new AlphaVantageEtfProvider();

      const result = await noKeyProvider.getEtfProfile('QQQ');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch and parse ETF profile successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEtfProfileResponse,
      } as Response);

      const result = await provider.getEtfProfile('QQQ');

      expect(result).not.toBeNull();
      expect(result!.ticker).toBe('QQQ');
      expect(result!.netAssets).toBe(365600000000);
      expect(result!.netExpenseRatio).toBe(0.002);
      expect(result!.dividendYield).toBe(0.0048);
      expect(result!.portfolioTurnover).toBe(0.08);
      expect(result!.inceptionDate).toBe('1999-03-10');
      expect(result!.leveraged).toBe('NO');
      expect(result!.fundName).toBeNull();
      expect(result!.issuer).toBeNull();
      expect(result!.isStale).toBe(false);
      expect(result!.isSaved).toBe(false);

      // Holdings parsed correctly
      expect(result!.topHoldings).toHaveLength(3);
      expect(result!.topHoldings[0]).toEqual({
        symbol: 'NVDA',
        description: 'NVIDIA CORP',
        weight: 0.0943,
      });

      // Sectors parsed correctly
      expect(result!.sectorAllocation).toHaveLength(2);
      expect(result!.sectorAllocation[0]).toEqual({
        sector: 'Information Technology',
        weight: 0.517,
      });

      // Top-10 concentration computed
      expect(result!.topTenConcentration).toBeCloseTo(0.0943 + 0.0836 + 0.0786, 4);
    });

    it('should uppercase the ticker', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEtfProfileResponse,
      } as Response);

      const result = await provider.getEtfProfile('qqq');

      expect(result!.ticker).toBe('QQQ');
    });

    it('should return null on 429 rate limit and set rate limited', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);

      const result = await provider.getEtfProfile('QQQ');

      expect(result).toBeNull();

      // Subsequent call should be skipped due to rate limiting
      const result2 = await provider.getEtfProfile('SPY');
      expect(result2).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the first call made
    });

    it('should return null on "Note" response (rate limit)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Note: 'API call frequency exceeded' }),
      } as Response);

      const result = await provider.getEtfProfile('QQQ');

      expect(result).toBeNull();
    });

    it('should return null on "Information" response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Information: 'Premium endpoint' }),
      } as Response);

      const result = await provider.getEtfProfile('QQQ');

      expect(result).toBeNull();
    });

    it('should return null on "Error Message" response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'Error Message': 'Invalid API call' }),
      } as Response);

      const result = await provider.getEtfProfile('INVALID');

      expect(result).toBeNull();
    });

    it('should return null when no meaningful data in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          net_assets: '',
          holdings: [],
          sectors: [],
        }),
      } as Response);

      const result = await provider.getEtfProfile('FAKE');

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.getEtfProfile('QQQ');

      expect(result).toBeNull();
    });

    it('should handle non-ok response with non-429 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await provider.getEtfProfile('QQQ');

      expect(result).toBeNull();
    });

    it('should handle missing optional fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          net_assets: '100000000',
          holdings: [{ symbol: 'A', description: 'Company A', weight: '0.5' }],
        }),
      } as Response);

      const result = await provider.getEtfProfile('TEST');

      expect(result).not.toBeNull();
      expect(result!.netExpenseRatio).toBeNull();
      expect(result!.dividendYield).toBeNull();
      expect(result!.portfolioTurnover).toBeNull();
      expect(result!.inceptionDate).toBeNull();
      expect(result!.leveraged).toBeNull();
      expect(result!.sectorAllocation).toEqual([]);
    });

    it('should reset rate limit after timeout', async () => {
      // Trigger rate limit
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);

      await provider.getEtfProfile('QQQ');

      // Advance time past the 60-second cooldown
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 61000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEtfProfileResponse,
      } as Response);

      const result = await provider.getEtfProfile('SPY');

      expect(result).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      jest.restoreAllMocks();
    });
  });

  describe('getEtfName', () => {
    it('should return null when API key is not configured', async () => {
      process.env.ALPHA_VANTAGE_KEY = '';
      const noKeyProvider = new AlphaVantageEtfProvider();

      const result = await noKeyProvider.getEtfName('QQQ');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return fund name from OVERVIEW endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Name: 'Invesco QQQ Trust', Symbol: 'QQQ' }),
      } as Response);

      const result = await provider.getEtfName('QQQ');

      expect(result).toBe('Invesco QQQ Trust');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('function=OVERVIEW&symbol=QQQ')
      );
    });

    it('should return null when Name field is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Symbol: 'QQQ' }),
      } as Response);

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
    });

    it('should return null on 429 rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
    });

    it('should return null on Note response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Note: 'Rate limited' }),
      } as Response);

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
    });

    it('should skip when rate limited', async () => {
      // Trigger rate limit via getEtfProfile
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);

      await provider.getEtfProfile('QQQ');

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return null on non-ok non-429 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await provider.getEtfName('QQQ');

      expect(result).toBeNull();
    });
  });
});
