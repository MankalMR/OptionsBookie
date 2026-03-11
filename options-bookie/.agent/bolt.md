
## 2024-05-18 - Avoid O(N^2) bottlenecks in Array.filter
 **Learning:** React components containing `.filter()` iterations on large collections (like transactions) can accidentally run in O(N^2) if they invoke heavy derivation logic or `find()` array lookups within the filter condition. This leads to slow renders, particularly in `analytics` components where complex history analysis occurs.
 **Action:** For performance improvements involving collection filtering, always extract the invariant aggregation functions (`getRealizedTransactions`) out of the `.filter` loop and memoize them via `useMemo`. Also convert secondary arrays checked within loops into `Set`s for O(1) lookups.
