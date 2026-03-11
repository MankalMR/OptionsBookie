## 2024-05-18 - Avoid O(N^2) bottlenecks in Array.filter
 **Learning:** React components containing `.filter()` iterations on large collections (like transactions) can accidentally run in O(N^2) if they invoke heavy derivation logic or `find()` array lookups within the filter condition. This leads to slow renders, particularly in `analytics` components where complex history analysis occurs.
 **Action:** For performance improvements involving collection filtering, always extract the invariant aggregation functions (`getRealizedTransactions`) out of the `.filter` loop and memoize them via `useMemo`. Also convert secondary arrays checked within loops into `Set`s for O(1) lookups.

## 2026-03-09 - Memoization in Thick Client
**Learning:** Next.js 14 client-side rendering bottlenecks can easily occur in the 'Thick Client' architecture when heavy domain calculations (like options profit math, filtering, or aggregations) are placed directly inside React components without memoization.
**Action:** Identified and optimized TransactionsTable.tsx by wrapping heavy data aggregation, filtering, and sorting in React.useMemo() and helper functions in React.useCallback() to prevent unnecessary re-renders on state changes.
