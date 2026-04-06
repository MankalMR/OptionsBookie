## 2025-02-14 - Prevent Information Disclosure in API Routes
**Learning:** Next.js API routes (e.g. `src/app/api/portfolios/[id]/route.ts`) were directly passing `error.message` strings to the client via `NextResponse.json` on error responses. This exposes internal details to potential attackers.
**Prevention:** Always replace the returned `error.message` with a generic static string (e.g., `'Failed to update portfolio'`) and ensure the true error is logged safely server-side using `logger.error()`.
