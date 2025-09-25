# 🚀 OptionsBookie Setup Guide

Complete setup guide for OptionsBookie including database configuration, environment variables, and deployment.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google OAuth credentials (optional)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd options-bookie
npm install
```

### 2. Database Setup

See [Database Setup](#database-setup) section below.

### 3. Environment Variables

See [Environment Variables](#environment-variables) section below.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3007` to see your app!

---

## 🗄️ Database Setup

### Fresh Installation

If you're setting up the database for the first time:

1. **Open Supabase SQL Editor**
2. **Run the main setup script**: Copy and paste the contents of `01-initial-database-setup.sql` into the SQL Editor and execute it.

That's it! The database will be fully configured with all tables, indexes, RLS policies, and triggers.

### Migration from Existing Database

If you have an existing database that needs to be updated, run the scripts in this order:

#### Step 1: Initial Setup
```sql
-- Run: 01-initial-database-setup.sql
-- This creates the basic schema with profiles and options_transactions tables
```

#### Step 2: Add Portfolio Support
```sql
-- Run: add-portfolio-support.sql
-- This adds the portfolios table and portfolio_id column to options_transactions
```

#### Step 3: Fix User ID Schema
```sql
-- Run: fix-user-id-schema.sql
-- This changes user_id from UUID to TEXT to support email addresses
```

#### Step 4: Fix RLS Policies
```sql
-- Run: fix-rls-simple.sql
-- This updates RLS policies to work with email-based user IDs
```

### Database Schema Overview

#### Tables

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

#### Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Email-based authentication** - Users can only access their own data
- **Portfolio ownership validation** - Users can only access portfolios they own
- **Transaction ownership validation** - Users can only access transactions in their portfolios

#### Functions and Triggers

- **update_updated_at_column()** - Automatically updates the `updated_at` timestamp
- **ensure_single_default_portfolio()** - Ensures only one default portfolio per user
- **create_default_portfolio_for_user()** - Creates default portfolio for new users

---

## ⚙️ Environment Variables

### Required Variables

Create a `.env.local` file in your project root:

```env
# Site URL (Required)
NEXT_PUBLIC_SITE_URL=https://options-bookie.mankala.space

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NextAuth Configuration (Required)
NEXTAUTH_URL=https://options-bookie.mankala.space
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Optional Variables

```env
# Site Information (Optional - defaults provided)
NEXT_PUBLIC_SITE_NAME=OptionsBookie
NEXT_PUBLIC_SITE_DESCRIPTION=Professional options trading tracker with real-time analytics, portfolio management, and comprehensive P&L reporting.
NEXT_PUBLIC_SITE_KEYWORDS=options trading,options tracker,trading analytics,portfolio management,covered calls,cash secured puts,options strategies,P&L tracking,trading journal,options calculator,trading performance,investment tracking

# Author Information (Optional - defaults provided)
NEXT_PUBLIC_AUTHOR_NAME=Manohar Mankala
NEXT_PUBLIC_AUTHOR_URL=https://mankala.space
NEXT_PUBLIC_AUTHOR_EMAIL=manohar.mankala@gmail.com

# OAuth & Authentication (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Analytics (Optional - not currently implemented)
# NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_google_analytics_id_here
# NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=your_gtm_id_here
```

### Environment-Specific Configuration

#### Development (.env.local)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3007
NEXTAUTH_URL=http://localhost:3007
```

#### Production (.env.production)
```env
NEXT_PUBLIC_SITE_URL=https://options-bookie.mankala.space
NEXTAUTH_URL=https://options-bookie.mankala.space
```

### How It Works

The application uses a centralized URL utility (`src/lib/url-utils.ts`) that:

1. **Automatically detects environment** (development vs production)
2. **Falls back to environment variables** when available
3. **Provides sensible defaults** for all configuration
4. **Works in both server and client contexts**

#### URL Resolution Priority:
1. `NEXT_PUBLIC_SITE_URL` environment variable
2. Production: `https://options-bookie.mankala.space`
3. Development: `http://localhost:3007`
4. Client-side: `window.location.origin`

---

## 💻 Local Development

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3007`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Development Features

- **Hot reload** - Changes reflect immediately
- **TypeScript** - Full type checking
- **ESLint** - Code quality checks
- **Tailwind CSS** - Utility-first styling
- **NextAuth.js** - Authentication
- **Supabase** - Database and auth

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
- **Check Supabase URL and keys** in environment variables
- **Verify RLS policies** are correctly configured
- **Test connection** with debug scripts

#### 2. Authentication Issues
- **Verify Google OAuth credentials** if using Google sign-in
- **Check NextAuth configuration** in environment variables
- **Ensure Supabase auth** is properly set up

#### 3. Build Issues
- **Check Node.js version** (requires 18+)
- **Clear node_modules** and reinstall: `rm -rf node_modules && npm install`
- **Check TypeScript errors**: `npx tsc --noEmit`

#### 4. RLS Policy Errors
- **Make sure you're using the correct user email format**
- **Check that RLS policies are correctly configured**
- **Verify user has a default portfolio created**

### Debug Scripts

Use the scripts in `scripts/debug/` to troubleshoot:
- `debug-rls.js` - Test RLS policies
- `test-rls.js` - Test database access
- `disable-rls-test.js` - Temporarily disable RLS for testing

### Backup and Recovery

Always backup your database before running migration scripts:

```sql
-- Create a backup
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

-- Restore from backup
psql your_database < backup_file.sql
```

### Getting Help

If you encounter issues:

1. **Check the Supabase logs**
2. **Verify your environment variables**
3. **Test with the debug scripts**
4. **Review the RLS policies**
5. **Check the console for errors**
6. **Review the documentation**

---

## 📚 Additional Resources

- [Deployment Guide](./DEPLOYMENT.md) - Deploy to Vercel
- [Security Guide](./SECURITY.md) - Security implementation
- [API Documentation](./src/app/api/README.md) - API endpoints
- [Component Documentation](./src/components/README.md) - UI components

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
