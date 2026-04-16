-- Migration: Remove static days_to_expiry and days_held columns
-- These values are now calculated dynamically in real-time

-- Remove days_to_expiry column from options_transactions table
ALTER TABLE public.options_transactions
DROP COLUMN IF EXISTS days_to_expiry;

-- Remove days_held column from options_transactions table
ALTER TABLE public.options_transactions
DROP COLUMN IF EXISTS days_held;

-- Note: These values are now calculated dynamically using:
-- DTE = calculateDTE(expiryDate) - days remaining until expiry
-- DH = calculateDH(tradeOpenDate) - days since trade was opened
-- This ensures always-accurate, real-time values without database maintenance
