-- =====================================================
-- Analyze ETFs Feature - Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Table 1: Shared ETF reference data cache (30-day TTL)
CREATE TABLE IF NOT EXISTS public.etf_cache (
  ticker TEXT PRIMARY KEY,
  fund_name TEXT,
  net_assets BIGINT,
  net_expense_ratio DECIMAL(8,6),
  dividend_yield DECIMAL(8,6),
  portfolio_turnover DECIMAL(8,6),
  inception_date DATE,
  leveraged TEXT,
  issuer TEXT,
  dividend_frequency TEXT,
  ex_dividend_date DATE,
  benchmark_index TEXT,
  asset_category TEXT,
  top_holdings JSONB NOT NULL DEFAULT '[]',
  sector_allocation JSONB NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT 'alphavantage',
  cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etf_cache_expires_at ON public.etf_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_etf_cache_fund_name ON public.etf_cache(fund_name);

CREATE TRIGGER update_etf_cache_updated_at
  BEFORE UPDATE ON public.etf_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.etf_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to etf_cache"
ON public.etf_cache FOR ALL
TO service_role
USING (true);

COMMENT ON TABLE public.etf_cache IS 'Shared ETF reference data cache with 30-day TTL';

-- Table 2: Per-user saved/favorited ETFs
CREATE TABLE IF NOT EXISTS public.user_saved_etfs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_saved_etf UNIQUE (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_etfs_user_id ON public.user_saved_etfs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_etfs_ticker ON public.user_saved_etfs(ticker);

ALTER TABLE public.user_saved_etfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to user_saved_etfs"
ON public.user_saved_etfs FOR ALL
TO service_role
USING (true);

COMMENT ON TABLE public.user_saved_etfs IS 'Per-user saved/favorited ETFs';
