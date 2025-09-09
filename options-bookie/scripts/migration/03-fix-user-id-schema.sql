-- Fix user_id column to accept email addresses temporarily
-- Run this in your Supabase SQL Editor

-- This script handles RLS policies properly by dropping and recreating them

BEGIN;

-- Step 1: Drop all RLS policies that reference user_id
DROP POLICY IF EXISTS "Users can view their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON options_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON options_transactions;

-- Step 2: Drop foreign key constraints
ALTER TABLE options_transactions
DROP CONSTRAINT IF EXISTS options_transactions_user_id_fkey;

-- Step 3: Alter the user_id column type from UUID to TEXT
ALTER TABLE options_transactions
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Recreate the RLS policies with the new column type
CREATE POLICY "Users can view their own transactions" ON options_transactions
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own transactions" ON options_transactions
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own transactions" ON options_transactions
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can delete their own transactions" ON options_transactions
  FOR DELETE USING (auth.uid()::TEXT = user_id);

COMMIT;
