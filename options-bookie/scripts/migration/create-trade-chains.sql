-- Trade Chains Implementation
-- Phase 1: Database Schema for tracking rolled options trades

-- Create trade_chains table
CREATE TABLE IF NOT EXISTS trade_chains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  option_type TEXT CHECK (option_type IN ('Call', 'Put')) NOT NULL,
  original_strike_price DECIMAL(10,2),
  original_open_date TIMESTAMPTZ,
  chain_status TEXT CHECK (chain_status IN ('Active', 'Closed')) DEFAULT 'Active',
  total_chain_pnl DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- RLS policy field
  CONSTRAINT chain_user_portfolio_check
    CHECK (user_id IS NOT NULL AND portfolio_id IS NOT NULL)
);

-- Add chain_id to options_transactions table
ALTER TABLE options_transactions
ADD COLUMN IF NOT EXISTS chain_id UUID REFERENCES trade_chains(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trade_chains_user_portfolio
  ON trade_chains(user_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_chain_id
  ON options_transactions(chain_id);

-- Enable RLS on trade_chains table
ALTER TABLE trade_chains ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own chains
CREATE POLICY "Users can view their own trade chains" ON trade_chains
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Update function for trade_chains updated_at
CREATE OR REPLACE FUNCTION update_trade_chains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_trade_chains_updated_at_trigger ON trade_chains;
CREATE TRIGGER update_trade_chains_updated_at_trigger
    BEFORE UPDATE ON trade_chains
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_chains_updated_at();

-- Confirmation
SELECT 'Trade chains schema created successfully' AS status;

