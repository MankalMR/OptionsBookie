// ETF Data Types

export interface EtfHolding {
  symbol: string;
  description: string;
  weight: number; // decimal, e.g. 0.0943 = 9.43%
}

export interface EtfSector {
  sector: string;
  weight: number; // decimal
}

export interface EtfProfile {
  ticker: string;
  fundName: string | null;
  issuer: string | null;
  netAssets: number | null;
  netExpenseRatio: number | null;
  dividendYield: number | null;
  dividendFrequency: string | null;
  exDividendDate: string | null;
  benchmarkIndex: string | null;
  assetCategory: string | null;
  inceptionDate: string | null;
  portfolioTurnover: number | null;
  leveraged: string | null;
  topHoldings: EtfHolding[];
  topTenConcentration: number | null;
  sectorAllocation: EtfSector[];
  cachedAt: string;
  isStale: boolean;
  isSaved: boolean;
}

export interface EtfSearchResult {
  ticker: string;
  fundName: string | null;
  isCached: boolean;
  isSaved: boolean;
}

export interface SavedEtf {
  ticker: string;
  fundName: string | null;
  netExpenseRatio: number | null;
  dividendYield: number | null;
  netAssets: number | null;
  savedAt: string;
  notes: string | null;
  isStale: boolean;
}

// Database row types (snake_case)
export interface EtfCacheRow {
  ticker: string;
  fund_name: string | null;
  net_assets: number | null;
  net_expense_ratio: number | null;
  dividend_yield: number | null;
  portfolio_turnover: number | null;
  inception_date: string | null;
  leveraged: string | null;
  issuer: string | null;
  dividend_frequency: string | null;
  ex_dividend_date: string | null;
  benchmark_index: string | null;
  asset_category: string | null;
  top_holdings: EtfHolding[];
  sector_allocation: EtfSector[];
  provider: string;
  cached_at: string;
  expires_at: string;
  updated_at: string;
}

export interface UserSavedEtfRow {
  id: string;
  user_id: string;
  ticker: string;
  notes: string | null;
  saved_at: string;
}

// Alpha Vantage ETF_PROFILE response shape
export interface AlphaVantageEtfProfileResponse {
  net_assets: string;
  net_expense_ratio: string;
  portfolio_turnover: string;
  dividend_yield: string;
  inception_date: string;
  leveraged: string;
  holdings: Array<{
    symbol: string;
    description: string;
    weight: string;
  }>;
  sectors: Array<{
    sector: string;
    weight: string;
  }>;
}
