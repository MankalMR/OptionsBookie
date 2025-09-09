# Database Setup Guide

This guide explains how to set up the OptionsBookie database from scratch or migrate from an existing setup.

## Quick Start (Fresh Installation)

If you're setting up the database for the first time, simply run the main setup script:

1. **Open Supabase SQL Editor**
2. **Run the main setup script**: Copy and paste the contents of `01-initial-database-setup.sql` into the SQL Editor and execute it.

That's it! The database will be fully configured with all tables, indexes, RLS policies, and triggers.

## Migration from Existing Database

If you have an existing database that needs to be updated, run the scripts in this order:

### Step 1: Initial Setup
```sql
-- Run: 01-initial-database-setup.sql
-- This creates the basic schema with profiles and options_transactions tables
```

### Step 2: Add Portfolio Support
```sql
-- Run: scripts/migration/02-add-portfolio-support.sql
-- This adds the portfolios table and portfolio_id column to options_transactions
```

### Step 3: Fix User ID Schema
```sql
-- Run: scripts/migration/03-fix-user-id-schema.sql
-- This changes user_id from UUID to TEXT to support email addresses
```

### Step 4: Fix RLS Policies
```sql
-- Run: scripts/migration/04-fix-rls-simple.sql
-- This updates RLS policies to work with email-based user IDs
```

## Database Schema Overview

### Tables

1. **profiles** - User profile information
   - `id` (UUID, PK) - References auth.users(id)
   - `full_name` (TEXT) - User's full name
   - `avatar_url` (TEXT) - User's avatar URL
   - `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

2. **portfolios** - User portfolios
   - `id` (UUID, PK) - Portfolio ID
   - `user_id` (TEXT) - User email address
   - `name` (TEXT) - Portfolio name
   - `description` (TEXT) - Portfolio description
   - `is_default` (BOOLEAN) - Whether this is the default portfolio
   - `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

3. **options_transactions** - Options trading transactions
   - `id` (UUID, PK) - Transaction ID
   - `user_id` (TEXT) - User email address
   - `portfolio_id` (UUID, FK) - References portfolios(id)
   - `stock_symbol` (TEXT) - Stock symbol
   - `trade_open_date` (TIMESTAMPTZ) - When the trade was opened
   - `expiry_date` (TIMESTAMPTZ) - Option expiry date
   - `call_or_put` (TEXT) - 'Call' or 'Put'
   - `buy_or_sell` (TEXT) - 'Buy' or 'Sell'
   - `stock_price_current` (DECIMAL) - Current stock price
   - `days_to_expiry` (INTEGER) - Days until expiry
   - `break_even_price` (DECIMAL) - Break-even price
   - `strike_price` (DECIMAL) - Strike price
   - `premium` (DECIMAL) - Option premium
   - `number_of_contracts` (INTEGER) - Number of contracts
   - `fees` (DECIMAL) - Trading fees
   - `status` (TEXT) - 'Open' or 'Closed'
   - `exit_price` (DECIMAL) - Exit price (if closed)
   - `close_date` (TIMESTAMPTZ) - Close date (if closed)
   - `profit_loss` (DECIMAL) - P&L amount
   - `days_held` (INTEGER) - Days the position was held
   - `annualized_ror` (DECIMAL) - Annualized return on risk
   - `cash_reserve` (DECIMAL) - Cash reserve required
   - `margin_cash_reserve` (DECIMAL) - Margin cash reserve
   - `cost_basis_per_share` (DECIMAL) - Cost basis per share
   - `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Email-based authentication** - Users can only access their own data
- **Portfolio ownership validation** - Users can only access portfolios they own
- **Transaction ownership validation** - Users can only access transactions in their portfolios

### Functions and Triggers

- **update_updated_at_column()** - Automatically updates the `updated_at` timestamp
- **ensure_single_default_portfolio()** - Ensures only one default portfolio per user
- **create_default_portfolio_for_user()** - Creates default portfolio for new users

## Environment Variables

Make sure your `.env.local` file contains:

```env
NEXTAUTH_URL=http://localhost:3007
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Make sure you're using the correct user email format
2. **Portfolio Not Found**: Ensure the user has a default portfolio created
3. **Permission Denied**: Check that RLS policies are correctly configured

### Debug Scripts

Use the scripts in `scripts/debug/` to troubleshoot:
- `debug-rls.js` - Test RLS policies
- `test-rls.js` - Test database access
- `disable-rls-test.js` - Temporarily disable RLS for testing

## Backup and Recovery

Always backup your database before running migration scripts:

```sql
-- Create a backup
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

-- Restore from backup
psql your_database < backup_file.sql
```

## Support

If you encounter issues:
1. Check the Supabase logs
2. Verify your environment variables
3. Test with the debug scripts
4. Review the RLS policies
