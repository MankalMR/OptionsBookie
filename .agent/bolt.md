## 2024-03-19 - UseMemo Missing Dependencies

 **Learning:** When adding `useMemo` hooks, be incredibly careful with the dependency arrays and ensure they exactly match the variables utilized inside the memoized function. For instance, in `quickStatsData`, adding `transactions` into the dependency array was superfluous. Also, don't forget to add inline comments documenting the optimizations as this is a strict requirement for Bolt PRs.
 **Action:** Prioritize explicitly matching dependency arrays to variables inside `useMemo`, and double-check prompt requirements before submitting for code review.

## 2025-03-26 - O(N*M) Loop Optimization in Chain Evaluations

 **Learning:** Nested array operations like `.filter()` or `.find()` inside a loop over another large array create O(N*M) complexity which scales poorly as the portfolio grows. Pre-grouping the inner array into a `Map` (e.g., grouping transactions by `chainId`) reduces this to O(N+M).
 **Action:** Always look for nested array operations in dashboard logic and refactor them using Map-based grouping or lookups.

## 2024-05-18 - Replacing Nested Array Search Loops with O(1) Map Lookups

 **Learning:** When processing transactions inside a loop (such as iterating over trade chains to calculate capital efficiency), calling `Array.prototype.find()` or `Array.prototype.filter()` against the master list on every iteration generates an O(N*M) time complexity bottleneck. In `src/utils/optionsCalculations.ts`, this was causing heavy rendering slowdowns for large portfolios.
 **Action:** Prioritize pre-computing `Map` objects (like `chainMap` and `txnsByChain`) at the start of utility functions. Refactoring internal loops to leverage `map.get()` reduces the lookup complexity to O(1), preventing UI thread locking without altering the underlying data output.
