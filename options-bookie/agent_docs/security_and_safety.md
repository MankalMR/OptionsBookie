# Security and Safety

## Row Level Security (RLS)
The database enforces strict isolation. No user can access another user's data.
- **Policy:** `user_id = auth.uid()` or `user_id = auth.email()` (via JWT claim injection).
- **Constraint:** **NEVER** disable RLS polices on tables containing user data.

## Server-Side Admin
- **`supabaseAdmin`**: A service-role client exists in `src/lib` for administrative tasks.
- **Rule:** Do not use `supabaseAdmin` for standard user operations. Always use the user-context client or ensure the query is explicitly scoped to the user ID.

## Authentication Architecture
- **Strategy:** **JWT-based**. The `SupabaseAdapter` is currently **disabled** to simplify login flows.
- **Enforcement:**
  - **API Routes**: All `/api/*` routes MUST verify `getServerSession(authOptions)` manually at the start of the handler.
  - **Middleware**: `middleware.ts` handles **Security Headers** (HSTS, CSP, XSS) and basic rate limiting, but **does NOT** enforce authentication. Do not rely on middleware for route protection.

## Secrets
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (Sensitive!)
  - `NEXTAUTH_SECRET`
- **Rule:** Never check secrets into git.

## Destructive Actions
- **Deletions**: Deleting a Portfolio must cascade delete its Transactions (handled by FK constraints), but always verify logic in `DeleteConfirmationModal`.

## Security Validation
Scripts are available in `scripts/` to verify security posture:
- **`scripts/test-rls.js`**: Validates that RLS policies effectively block unauthorized access.
- **`scripts/pre-commit-security-check.sh`**: Scans for potentially unsafe patterns before commit.
