1. **Identify the Security Vulnerability**
   - The user requested to identify and fix one security vulnerability without breaking core logic.
   - The mission stated: "Look for missing `getServerSession` checks, RLS bypasses, leaked secrets, IDOR, or XSS".
   - The instruction also said "Fix defensively. Prevent error detail leakage."
   - Looking at `src/app/api/portfolios/[id]/route.ts`, the `PATCH` and `DELETE` endpoints leak `error.message` directly in the HTTP response:
     ```typescript
     return NextResponse.json(
       { error: error instanceof Error ? error.message : 'Failed to update portfolio' },
       { status: 500 }
     );
     ```
     This can expose internal database details or unhandled error messages to the client. This is an Information Exposure vulnerability.

2. **Secure the Code**
   - Modify `src/app/api/portfolios/[id]/route.ts` to replace the leaked `error.message` with a generic error response, such as "Failed to update portfolio" or "Failed to delete portfolio".
   - This ensures internal errors are logged using `logger.error` but are not sent to the end user.
   - The fix requires modifying only a few lines in `src/app/api/portfolios/[id]/route.ts`.

3. **Verify the Fix**
   - Ensure the NextJS build (`npm run build`) works.
   - Run tests (`npm test` and `node scripts/test-rls.js`).
   - Run linter (`npm run lint`).

4. **Complete Pre-commit Steps**
   - Call `pre_commit_instructions` and complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
