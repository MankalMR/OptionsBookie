-- =====================================================
-- OptionsBookie - Initial Database Setup Script
-- =====================================================
-- This script creates the complete database schema for the OptionsBookie application
-- Run this script in your Supabase SQL Editor to set up the database from scratch
-- =====================================================-- =====================================================

-- Step 1: Create NextAuth Schema and Permissions
-- This is required for NextAuth @auth/supabase-adapter to function
CREATE SCHEMA IF NOT EXISTS next_auth;

-- Grant usage of the schema to service_role (needed for NextAuth server-side)
GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT USAGE ON SCHEMA next_auth TO postgres;

-- Create users table
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid not null default gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamp with time zone,
  image text,
  primary key (id)
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid not null default gen_random_uuid(),
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  primary key (id),
  unique(provider, "providerAccountId")
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid not null default gen_random_uuid(),
  expires timestamp with time zone not null,
  "sessionToken" text not null,
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  primary key (id),
  unique("sessionToken")
);

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text,
  expires timestamp with time zone not null,
  primary key (identifier, token)
);

-- Grant all privileges on all current tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO postgres;

-- Grant all privileges on all current routines/sequences
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO postgres;

-- Ensure future tables also get these permissions automatically
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth GRANT ALL ON ROUTINES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO service_role;

-- Step 2: Create profiles table (recommended by Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Create options_transactions table
CREATE TABLE IF NOT EXISTS public.options_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Using TEXT to store email addresses
  stock_symbol TEXT NOT NULL,
  trade_open_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  call_or_put TEXT NOT NULL CHECK (call_or_put IN ('Call', 'Put')),
  buy_or_sell TEXT NOT NULL CHECK (buy_or_sell IN ('Buy', 'Sell')),
  stock_price_current DECIMAL(10,2) NOT NULL,
  days_to_expiry INTEGER NOT NULL,
  break_even_price DECIMAL(10,2) NOT NULL,
  strike_price DECIMAL(10,2) NOT NULL,
  premium DECIMAL(10,2) NOT NULL,
  number_of_contracts INTEGER NOT NULL,
  fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Closed')),
  exit_price DECIMAL(10,2),
  close_date TIMESTAMPTZ,
  profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
  days_held INTEGER NOT NULL DEFAULT 0,
  annualized_ror DECIMAL(10,2),
  cash_reserve DECIMAL(10,2),
  margin_cash_reserve DECIMAL(10,2),
  cost_basis_per_share DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 4: Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Using TEXT to store email addresses
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure only one default portfolio per user
  CONSTRAINT unique_default_portfolio_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Step 5: Add portfolio_id column to options_transactions
ALTER TABLE public.options_transactions
ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- Step 6: Enable RLS on all tables
ALTER TABLE public.options_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for options_transactions (email-based)
CREATE POLICY "Users can view their own transactions" ON public.options_transactions
  FOR SELECT USING (user_id = auth.email());

CREATE POLICY "Users can insert their own transactions" ON public.options_transactions
  FOR INSERT WITH CHECK (user_id = auth.email());

CREATE POLICY "Users can update their own transactions" ON public.options_transactions
  FOR UPDATE USING (user_id = auth.email());

CREATE POLICY "Users can delete their own transactions" ON public.options_transactions
  FOR DELETE USING (user_id = auth.email());

-- Step 8: Create RLS policies for portfolios (email-based)
CREATE POLICY "Users can view their own portfolios" ON public.portfolios
  FOR SELECT USING (user_id = auth.email());

CREATE POLICY "Users can insert their own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (user_id = auth.email());

CREATE POLICY "Users can update their own portfolios" ON public.portfolios
  FOR UPDATE USING (user_id = auth.email())
  WITH CHECK (user_id = auth.email());

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios
  FOR DELETE USING (user_id = auth.email());

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_options_transactions_user_id ON public.options_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_options_transactions_stock_symbol ON public.options_transactions(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_options_transactions_status ON public.options_transactions(status);
CREATE INDEX IF NOT EXISTS idx_options_transactions_trade_open_date ON public.options_transactions(trade_open_date);
CREATE INDEX IF NOT EXISTS idx_options_transactions_expiry_date ON public.options_transactions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_options_transactions_portfolio_id ON public.options_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);

-- Step 10: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers to automatically update updated_at
CREATE TRIGGER update_options_transactions_updated_at
  BEFORE UPDATE ON public.options_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Create function to ensure only one default portfolio per user
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

-- Step 13: Create trigger to ensure single default portfolio
CREATE TRIGGER ensure_single_default_portfolio_trigger
  BEFORE INSERT OR UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_portfolio();

-- Step 14: Create function to create default portfolio for new users
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
    VALUES (user_email, 'Default Portfolio', 'Default portfolio for new user', TRUE)
    RETURNING id INTO portfolio_id;
  END IF;

  RETURN portfolio_id;
END;
$$ language 'plpgsql';

-- =====================================================
-- Setup Complete!
-- =====================================================
-- The database is now ready for the OptionsBookie application.
--
-- Next steps:
-- 1. Configure your environment variables (.env.local)
-- 2. Set up NextAuth.js with Google OAuth
-- 3. Run the application
--
-- The application will automatically create default portfolios
-- for new users when they first log in.
--
-- IMPORTANT: Make sure to Expose the `next_auth` schema in your 
-- Supabase Dashboard -> Settings -> API -> Exposed schemas.
-- =====================================================
