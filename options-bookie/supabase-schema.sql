-- Create profiles table (recommended by Supabase)
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

-- Create options_transactions table
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
