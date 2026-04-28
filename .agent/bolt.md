## 2025-02-23 - Transactions Table rendering optimization
**Learning:** In a "Thick Client" architecture, rendering lists of transactions can be slow if aggregations and filtering occur on every render.
**Action:** Implemented O(1) Map lookups for `globalChainsMap` and `globalTxnsByChain` inside `TransactionsTable.tsx` using `useMemo`, and passed them to calculation functions to prevent O(N) recalculations on every render.

