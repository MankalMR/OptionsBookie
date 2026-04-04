## 2024-03-19 - UseMemo Missing Dependencies

 **Learning:** When adding `useMemo` hooks, be incredibly careful with the dependency arrays and ensure they exactly match the variables utilized inside the memoized function. For instance, in `quickStatsData`, adding `transactions` into the dependency array was superfluous. Also, don't forget to add inline comments documenting the optimizations as this is a strict requirement for Bolt PRs.
 **Action:** Prioritize explicitly matching dependency arrays to variables inside `useMemo`, and double-check prompt requirements before submitting for code review.

## 2025-03-26 - O(N*M) Loop Optimization in Chain Evaluations

 **Learning:** Nested array operations like `.filter()` or `.find()` inside a loop over another large array create O(N*M) complexity which scales poorly as the portfolio grows. Pre-grouping the inner array into a `Map` (e.g., grouping transactions by `chainId`) reduces this to O(N+M).
 **Action:** Always look for nested array operations in dashboard logic and refactor them using Map-based grouping or lookups.

## 2024-05-18 - Optimized getRealizedTransactions in SummaryView
**Learning:** `SummaryView` repeatedly calculates `getRealizedTransactions(transactions, chains)` for different metrics (yearly breakdown, charts, best stocks, top tickers). This triggers an O(N) filtering loop across the entire transaction dataset multiple times per render, specifically inside `useMemo` blocks and helper functions, causing unnecessary CPU overhead and performance bottlenecks.
**Action:** Memoize the result of `getRealizedTransactions` once at the top level of `SummaryView` or use `realizedTransactions` where appropriate, avoiding repeated full-array traversals.
