-- Simple RLS fix for email-based user system
-- This will temporarily disable RLS to test, then re-enable with proper policies

BEGIN;

-- Step 1: Disable RLS temporarily
ALTER TABLE options_transactions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON options_transactions;

-- Step 3: Re-enable RLS
ALTER TABLE options_transactions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple policies that work with email-based user IDs
-- These policies will allow access when user_id matches the authenticated user's email
CREATE POLICY "Users can view their own transactions" ON options_transactions
  FOR SELECT USING (user_id = auth.email());

CREATE POLICY "Users can insert their own transactions" ON options_transactions
  FOR INSERT WITH CHECK (user_id = auth.email());

CREATE POLICY "Users can update their own transactions" ON options_transactions
  FOR UPDATE USING (user_id = auth.email());

CREATE POLICY "Users can delete their own transactions" ON options_transactions
  FOR DELETE USING (user_id = auth.email());

COMMIT;
