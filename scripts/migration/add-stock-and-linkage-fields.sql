-- Stock Lot Tracking and Covered Call Linkage Migration
-- Phase 1: Update options_transactions table schema in Supabase

-- Step 1: Drop NOT NULL constraints from option-specific columns to support stock transactions
ALTER TABLE public.options_transactions ALTER COLUMN expiry_date DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN call_or_put DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN stock_price_current DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN break_even_price DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN strike_price DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN premium DROP NOT NULL;
ALTER TABLE public.options_transactions ALTER COLUMN number_of_contracts DROP NOT NULL;

-- Step 2: Add transaction_type column (defaults to 'option')
ALTER TABLE public.options_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'option'
CHECK (transaction_type IN ('option', 'stock'));

-- Step 3: Add stock-specific columns
ALTER TABLE public.options_transactions
ADD COLUMN IF NOT EXISTS shares_quantity INTEGER,
ADD COLUMN IF NOT EXISTS share_price DECIMAL(10,2);

-- Step 4: Add coverage linkage columns
ALTER TABLE public.options_transactions
ADD COLUMN IF NOT EXISTS covered_by_type TEXT NOT NULL DEFAULT 'none'
CHECK (covered_by_type IN ('stock', 'option', 'none')),
ADD COLUMN IF NOT EXISTS covered_by_id UUID REFERENCES public.options_transactions(id) ON DELETE SET NULL;

-- Step 5: Add indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_options_transactions_transaction_type
  ON public.options_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_options_transactions_covered_by_id
  ON public.options_transactions(covered_by_id);

-- Confirmation
SELECT 'Stock and linkage schema updates applied successfully' AS status;
