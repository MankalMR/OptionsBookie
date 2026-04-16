# Database Schema and Data Access

## Technology
- **Database:** PostgreSQL (via Supabase).
- **ORM:** None (using Supabase JS SDK query builder).

## Core Tables

### 1. `profiles`
- Connects to Supabase Auth.
- Stores user metadata.

### 2. `portfolios`
- Logical grouping of transactions.
- Fields: `id`, `user_id`, `name`, `is_default`.

### 3. `options_transactions`
- The ledger of all trades.
- **Key Fields**:
  - `user_id`, `portfolio_id`: Ownership (RLS keys).
  - `stock_symbol`: Ticker.
  - `premium`, `strike_price`, `number_of_contracts`: Financials.
  - `status`: `Open` | `Closed` | `Expired` | `Assigned` | `Rolled`.
  - `chain_id`: Links related trades (e.g., rolls).
  - `collateral_amount`: Manual override for specific strategies.
  - `exit_price`, `close_date`: Nullable fields for closed trades.

## Data Transfer Objects (DTOs)
The application uses strict DTO mapping to handle the mismatch between SQL `snake_case` and TypeScript `camelCase`.

**Location:** `src/lib/database-supabase.ts`
- `rowToTransaction(row)`: SQL -> TS
- `transactionToRow(tx)`: TS -> SQL

**IMPORTANT:** Any schema change must be immediately reflected in these valid mapping functions, or the app will crash/show incorrect data.

## Migrations & Scripts
The project does not use a standard migration tool like Prisma or Drizzle. Changes are applied via SQL scripts.

- **Initial Setup:** `01-initial-database-setup.sql` (Canonical).
- **Updates:** Check `scripts/migration/` folder for versioned changes (e.g., `add-portfolio-support.sql`).
- **Execution:** New scripts are typically run **manually** in the Supabase SQL Editor. The `npm run db:setup` script is just a placeholder instruction.
