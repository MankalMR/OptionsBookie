## 2026-03-09 - Memoization in Thick Client
**Learning:** Next.js 14 client-side rendering bottlenecks can easily occur in the 'Thick Client' architecture when heavy domain calculations (like options profit math, filtering, or aggregations) are placed directly inside React components without memoization.
**Action:** Identified and optimized TransactionsTable.tsx by wrapping heavy data aggregation, filtering, and sorting in React.useMemo() and helper functions in React.useCallback() to prevent unnecessary re-renders on state changes.
