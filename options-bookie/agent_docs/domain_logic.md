# Domain Logic Deep Dive

The "Brain" of OptionsBookie is in `src/utils`. This separates it from standard CRUD apps.

## 1. Options Calculations (`optionsCalculations.ts`)
Handles standard formulaic math.

- **P&L**: `(Exit - Entry) * Contracts * 100 - Fees`.
  - *Note:* Short positions (selling calls/puts) inverse the exit/entry logic.
- **Annualized RoR**: `(RoR) * (365 / DaysHeld)`.
  - *Critical:* Handling `DaysHeld = 0` (Same day trades) to avoid infinity.
- **Strategy Type**: Auto-detected based on:
  - `Put` + `Sell` = Cash Secured Put
  - `Call` + `Sell` = Covered Call
  - `Put` + `Buy` = Long Put

## 2. Time Overlap & Capital Efficiency (`timeOverlapDetection.ts`)
This module calculates the **Dual Metrics**:

1.  **Peak Exposure**: The maximum potential loss at any single point in time. This sums the collateral of *concurrently overlapping* trades.
2.  **Time-Weighted Capital**: The average capital deployed over a period, accounting for *sequential reuse* of the same collateral.

**Algorithm:**
1.  Sort trades by `Open Date`.
2.  Iterate through timeline.
3.  If Trade B opens before Trade A closes -> **Overlap** (Add collaterals).
4.  If Trade B opens after Trade A closes -> **Sequential** (Reuse collateral).

> **Deep Dive:** For the full theoretical basis and sequence diagrams of this system, read **`CAPITAL_CALCULATION_ARCHITECTURE.md`** in the project root.

## 3. Trade Chains
- **Concept**: Rolling a trade (closing one, opening another to extend duration) links them via a `chainId`.
- **Logic**: A "Chain" is considered *Open* if any of its legs are *Open*. P&L is aggregated across the entire chain.
