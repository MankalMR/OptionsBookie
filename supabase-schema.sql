-- =====================================================
-- Step 1: Create NextAuth Schema and Permissions
-- This is required for NextAuth @auth/supabase-adapter to function
-- =====================================================
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
CREATE TABLE IF NOT EXISTS options_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
  status TEXT NOT NULL CHECK (status IN ('Open', 'Closed', 'Rolled Forward')),
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

-- Enable RLS on options_transactions
ALTER TABLE options_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transactions" ON options_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON options_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON options_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON options_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_options_transactions_user_id ON options_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_options_transactions_stock_symbol ON options_transactions(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_options_transactions_status ON options_transactions(status);
CREATE INDEX IF NOT EXISTS idx_options_transactions_trade_open_date ON options_transactions(trade_open_date);
CREATE INDEX IF NOT EXISTS idx_options_transactions_expiry_date ON options_transactions(expiry_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_options_transactions_updated_at
  BEFORE UPDATE ON options_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
