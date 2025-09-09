-- Add portfolio support to the options trading system
-- This script adds portfolios table and updates options_transactions to support multiple portfolios per user

-- Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Using TEXT to match the current user_id type
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure only one default portfolio per user
  CONSTRAINT unique_default_portfolio_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS on portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolios
CREATE POLICY "Users can view their own portfolios" ON public.portfolios
  FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can update their own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.email() = user_id)
  WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios
  FOR DELETE USING (auth.email() = user_id);

-- Add portfolio_id column to options_transactions
ALTER TABLE public.options_transactions
ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- Create index for portfolio_id
CREATE INDEX IF NOT EXISTS idx_options_transactions_portfolio_id ON public.options_transactions(portfolio_id);

-- Update RLS policies for options_transactions to include portfolio ownership
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.options_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.options_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.options_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.options_transactions;

-- Recreate RLS policies with portfolio support
CREATE POLICY "Users can view their own transactions" ON public.options_transactions
  FOR SELECT USING (
    auth.email() = user_id AND
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.email()
    )
  );

CREATE POLICY "Users can insert their own transactions" ON public.options_transactions
  FOR INSERT WITH CHECK (
    auth.email() = user_id AND
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.email()
    )
  );

CREATE POLICY "Users can update their own transactions" ON public.options_transactions
  FOR UPDATE USING (
    auth.email() = user_id AND
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.email()
    )
  );

CREATE POLICY "Users can delete their own transactions" ON public.options_transactions
  FOR DELETE USING (
    auth.email() = user_id AND
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.email()
    )
  );

-- Create trigger to update portfolios updated_at
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to ensure only one default portfolio per user
CREATE OR REPLACE FUNCTION ensure_single_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this portfolio as default, unset all other defaults for this user
  IF NEW.is_default = TRUE THEN
    UPDATE public.portfolios
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to ensure single default portfolio
CREATE TRIGGER ensure_single_default_portfolio_trigger
  BEFORE INSERT OR UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_portfolio();

-- Create function to create default portfolio for existing users
CREATE OR REPLACE FUNCTION create_default_portfolio_for_user(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  portfolio_id UUID;
BEGIN
  -- Check if user already has a default portfolio
  SELECT id INTO portfolio_id
  FROM public.portfolios
  WHERE user_id = user_email AND is_default = TRUE;

  -- If no default portfolio exists, create one
  IF portfolio_id IS NULL THEN
    INSERT INTO public.portfolios (user_id, name, description, is_default)
    VALUES (user_email, 'Default Portfolio', 'Default portfolio for existing transactions', TRUE)
    RETURNING id INTO portfolio_id;
  END IF;

  RETURN portfolio_id;
END;
$$ language 'plpgsql';

-- Create default portfolios for existing users and assign their transactions
DO $$
DECLARE
  user_record RECORD;
  default_portfolio_id UUID;
BEGIN
  -- Get all unique users from options_transactions
  FOR user_record IN
    SELECT DISTINCT user_id FROM public.options_transactions
  LOOP
    -- Create default portfolio for this user
    SELECT create_default_portfolio_for_user(user_record.user_id) INTO default_portfolio_id;

    -- Assign all transactions for this user to their default portfolio
    UPDATE public.options_transactions
    SET portfolio_id = default_portfolio_id
    WHERE user_id = user_record.user_id AND portfolio_id IS NULL;
  END LOOP;
END $$;

-- Make portfolio_id NOT NULL after assigning existing transactions
ALTER TABLE public.options_transactions
ALTER COLUMN portfolio_id SET NOT NULL;
