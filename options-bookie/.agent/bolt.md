
## 2024-05-18 - Avoid O(N^2) bottlenecks in Array.filter
 **Learning:** React components containing `.filter()` iterations on large collections (like transactions) can accidentally run in O(N^2) if they invoke heavy derivation logic or `find()` array lookups within the filter condition. This leads to slow renders, particularly in `analytics` components where complex history analysis occurs.
 **Action:** For performance improvements involving collection filtering, always extract the invariant aggregation functions (`getRealizedTransactions`) out of the `.filter` loop and memoize them via `useMemo`. Also convert secondary arrays checked within loops into `Set`s for O(1) lookups.
## 2024-03-13 - Avoid O(N^2) bottlenecks in filtering inside iterators
 **Learning:** React components containing `.map()` or `.filter()` iterations on collections (like months) can accidentally run in O(N^2) or worse if they invoke heavy derivation logic inside the loop, such as filtering the entire global transaction array `O(N)` for each item in the iterator `O(M)`.
 **Action:** For performance improvements, pre-calculate the grouped mapping `O(N)` into a Map or Array indexed by the desired property, and memoize it. Then perform O(1) lookups inside the iterators (e.g. mapping over months).
