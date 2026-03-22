-- Create stock price cache table for shared caching across all users
CREATE TABLE IF NOT EXISTS public.stock_price_cache (
  symbol TEXT PRIMARY KEY,
  price DECIMAL(10,2) NOT NULL,
  change DECIMAL(10,2) NOT NULL,
  change_percent DECIMAL(10,4) NOT NULL,
  timestamp TEXT NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_price_cache_expires_at 
ON public.stock_price_cache(expires_at);

-- Create index for symbol lookups
CREATE INDEX IF NOT EXISTS idx_stock_price_cache_symbol 
ON public.stock_price_cache(symbol);

-- Add RLS (Row Level Security) - allow all users to read/write cache
ALTER TABLE public.stock_price_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read cache
CREATE POLICY "Allow all users to read stock price cache" 
ON public.stock_price_cache FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow all authenticated users to write cache
CREATE POLICY "Allow all users to write stock price cache" 
ON public.stock_price_cache FOR ALL 
TO authenticated 
USING (true);

-- Add comment
COMMENT ON TABLE public.stock_price_cache IS 'Shared cache for stock prices across all users with 1-week TTL';
COMMENT ON COLUMN public.stock_price_cache.symbol IS 'Stock symbol (uppercase)';
COMMENT ON COLUMN public.stock_price_cache.price IS 'Current stock price';
COMMENT ON COLUMN public.stock_price_cache.change IS 'Price change (absolute)';
COMMENT ON COLUMN public.stock_price_cache.change_percent IS 'Price change (percentage)';
COMMENT ON COLUMN public.stock_price_cache.timestamp IS 'Original timestamp from API';
COMMENT ON COLUMN public.stock_price_cache.cached_at IS 'When this was cached';
COMMENT ON COLUMN public.stock_price_cache.expires_at IS 'When this cache entry expires (1 week TTL)';
