/**
 * demo-seed-data.ts
 *
 * Realistic sample portfolio for the demo mode.
 * Returns a fresh deep copy of the seed state each time —
 * so mutations to one session don't bleed into another.
 *
 * Portfolio covers:
 *  - Cash-Secured Puts (AVGO, AXON, ISRG)
 *  - Covered Calls (TSLA)
 *  - LEAP Long Call (ASML)
 *  - Multi-roll chains (TSLA, AVGO) with Rolled + Open legs
 *  - Closed wins and one loss for realistic win-rate display
 */

import { DemoState } from './demo-store';
import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';

// ---------------------------------------------------------------------------
// Bump this string whenever you change the seed data.
// DemoStore.getOrCreate() compares this against the stored value and
// automatically reseeds any session that is running an older version.
// ---------------------------------------------------------------------------
export const SEED_VERSION = '2026-03-05-v2'; // TSLA/AVGO/AXON/ASML/ISRG dataset

// ---------------------------------------------------------------------------
// Fixed demo IDs (deterministic, so reset is stable)
// ---------------------------------------------------------------------------
const PORTFOLIO_ID = 'demo-portfolio-001';

// Chain IDs
const CHAIN_TSLA = 'demo-chain-tsla-001';
const CHAIN_AVGO = 'demo-chain-avgo-001';
const CHAIN_AXON = 'demo-chain-axon-001';

// Helper to build a Date from a simple string in LOCAL time (no TZ shift)
function d(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------
function makePortfolio(): Portfolio {
    return {
        id: PORTFOLIO_ID,
        userId: 'demo-user',
        name: 'Demo Portfolio — Rollover IRA',
        description: 'Simulated portfolio for demo mode. No real trades.',
        isDefault: true,
        createdAt: d('2024-01-01'),
        updatedAt: d('2024-01-01'),
    };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
function makeTransactions(): OptionsTransaction[] {
    const base = {
        portfolioId: PORTFOLIO_ID,
        breakEvenPrice: 0,
        createdAt: d('2024-01-01'),
        updatedAt: d('2024-01-01'),
    };

    return [
        // -----------------------------------------------------------------------
        // 1 & 2 & 3. TSLA — Covered Call chain (2 Rolled + 1 Open)
        //   Strategy: Sell OTM calls against a long TSLA position
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-tsla-001',
            stockSymbol: 'TSLA',
            tradeOpenDate: d('2025-07-07'),
            expiryDate: d('2025-08-15'),
            callOrPut: 'Call',
            buyOrSell: 'Sell',
            strikePrice: 280,
            premium: 8.50,
            numberOfContracts: 2,
            collateralAmount: 56000,
            breakEvenPrice: 288.50,
            fees: 1.32,
            status: 'Rolled',
            chainId: CHAIN_TSLA,
            closeDate: d('2025-08-08'),
            exitPrice: 3.20,
            profitLoss: 1095.36,
            annualizedROR: 52.30,
            stockPriceCurrent: 265.40,
        },
        {
            ...base,
            id: 'demo-tx-tsla-002',
            stockSymbol: 'TSLA',
            tradeOpenDate: d('2025-08-08'),
            expiryDate: d('2025-10-17'),
            callOrPut: 'Call',
            buyOrSell: 'Sell',
            strikePrice: 275,
            premium: 9.80,
            numberOfContracts: 2,
            collateralAmount: 55000,
            breakEvenPrice: 284.80,
            fees: 1.32,
            status: 'Rolled',
            chainId: CHAIN_TSLA,
            closeDate: d('2025-10-10'),
            exitPrice: 4.50,
            profitLoss: 1057.36,
            annualizedROR: 42.80,
            stockPriceCurrent: 265.40,
        },
        {
            ...base,
            id: 'demo-tx-tsla-003',
            stockSymbol: 'TSLA',
            tradeOpenDate: d('2025-10-10'),
            expiryDate: d('2026-01-16'),
            callOrPut: 'Call',
            buyOrSell: 'Sell',
            strikePrice: 300,
            premium: 14.20,
            numberOfContracts: 2,
            collateralAmount: 60000,
            breakEvenPrice: 314.20,
            fees: 1.32,
            status: 'Open',
            chainId: CHAIN_TSLA,
            stockPriceCurrent: 265.40,
        },

        // -----------------------------------------------------------------------
        // 4 & 5. AVGO — Cash-Secured Put chain (1 Rolled + 1 Open)
        //   Strategy: Sell CSPs below support as AVGO pulled back
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-avgo-001',
            stockSymbol: 'AVGO',
            tradeOpenDate: d('2025-08-04'),
            expiryDate: d('2025-10-17'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 155,
            premium: 6.80,
            numberOfContracts: 1,
            cashReserve: 15500,
            collateralAmount: 15500,
            breakEvenPrice: 148.20,
            fees: 0.66,
            status: 'Rolled',
            chainId: CHAIN_AVGO,
            closeDate: d('2025-10-09'),
            exitPrice: 2.90,
            profitLoss: 389.34,
            annualizedROR: 44.20,
            stockPriceCurrent: 178.55,
        },
        {
            ...base,
            id: 'demo-tx-avgo-002',
            stockSymbol: 'AVGO',
            tradeOpenDate: d('2025-10-09'),
            expiryDate: d('2026-01-16'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 160,
            premium: 8.40,
            numberOfContracts: 1,
            cashReserve: 16000,
            collateralAmount: 16000,
            breakEvenPrice: 151.60,
            fees: 0.66,
            status: 'Open',
            chainId: CHAIN_AVGO,
            stockPriceCurrent: 178.55,
        },

        // -----------------------------------------------------------------------
        // 6 & 7. AXON — CSP chain, fully CLOSED (clean win + roll)
        //   Strategy: Sell puts during post-earnings dip
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-axon-001',
            stockSymbol: 'AXON',
            tradeOpenDate: d('2025-05-05'),
            expiryDate: d('2025-07-18'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 340,
            premium: 12.50,
            numberOfContracts: 1,
            cashReserve: 34000,
            collateralAmount: 34000,
            breakEvenPrice: 327.50,
            fees: 0.66,
            status: 'Rolled',
            chainId: CHAIN_AXON,
            closeDate: d('2025-07-10'),
            exitPrice: 4.80,
            profitLoss: 769.34,
            annualizedROR: 58.70,
            stockPriceCurrent: 398.25,
        },
        {
            ...base,
            id: 'demo-tx-axon-002',
            stockSymbol: 'AXON',
            tradeOpenDate: d('2025-07-10'),
            expiryDate: d('2025-09-19'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 360,
            premium: 10.20,
            numberOfContracts: 1,
            cashReserve: 36000,
            collateralAmount: 36000,
            breakEvenPrice: 349.80,
            fees: 0.66,
            status: 'Closed',
            chainId: CHAIN_AXON,
            closeDate: d('2025-09-12'),
            exitPrice: 1.50,
            profitLoss: 869.34,
            annualizedROR: 71.50,
            stockPriceCurrent: 398.25,
        },

        // -----------------------------------------------------------------------
        // 8. ASML — LEAP Long Call (Open)
        //   Strategy: Buy 2027 LEAP to participate in AI capex supercycle
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-asml-001',
            stockSymbol: 'ASML',
            tradeOpenDate: d('2025-04-10'),
            expiryDate: d('2027-01-15'),
            callOrPut: 'Call',
            buyOrSell: 'Buy',
            strikePrice: 700,
            premium: 85.00,
            numberOfContracts: 1,
            collateralAmount: 8500,
            breakEvenPrice: 785.00,
            fees: 0.66,
            status: 'Open',
            stockPriceCurrent: 752.40,
        },

        // -----------------------------------------------------------------------
        // 9. ISRG — Simple closed CSP win (no chain)
        //   Strategy: Sell cash-secured put ahead of earnings beat
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-isrg-001',
            stockSymbol: 'ISRG',
            tradeOpenDate: d('2025-09-08'),
            expiryDate: d('2025-10-17'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 480,
            premium: 9.50,
            numberOfContracts: 1,
            cashReserve: 48000,
            collateralAmount: 48000,
            breakEvenPrice: 470.50,
            fees: 0.66,
            status: 'Closed',
            closeDate: d('2025-10-10'),
            exitPrice: 1.80,
            profitLoss: 769.34,
            annualizedROR: 62.30,
            stockPriceCurrent: 535.80,
        },

        // -----------------------------------------------------------------------
        // 10. TSLA — Simple closed Put loss (no chain, for realistic win-rate)
        //   Strategy: Sold put too close to earnings, rolled the dice and lost
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-tsla-004',
            stockSymbol: 'TSLA',
            tradeOpenDate: d('2025-10-01'),
            expiryDate: d('2025-10-24'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 250,
            premium: 4.20,
            numberOfContracts: 2,
            cashReserve: 50000,
            collateralAmount: 50000,
            breakEvenPrice: 245.80,
            fees: 1.32,
            status: 'Closed',
            closeDate: d('2025-10-22'),
            exitPrice: 9.80,
            profitLoss: -1121.32,
            annualizedROR: -98.40,
            stockPriceCurrent: 265.40,
        },

        // -----------------------------------------------------------------------
        // 11. AVGO — Open CSP (standalone, no chain)
        //   Strategy: Wheel continuation — fresh CSP for income
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-avgo-003',
            stockSymbol: 'AVGO',
            tradeOpenDate: d('2025-11-10'),
            expiryDate: d('2026-02-20'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 165,
            premium: 7.20,
            numberOfContracts: 1,
            cashReserve: 16500,
            collateralAmount: 16500,
            breakEvenPrice: 157.80,
            fees: 0.66,
            status: 'Open',
            stockPriceCurrent: 178.55,
        },

        // -----------------------------------------------------------------------
        // 12. ISRG — Open CSP (standalone)
        //   Strategy: Re-enter ISRG after last put expired worthless
        // -----------------------------------------------------------------------
        {
            ...base,
            id: 'demo-tx-isrg-002',
            stockSymbol: 'ISRG',
            tradeOpenDate: d('2025-11-17'),
            expiryDate: d('2026-03-20'),
            callOrPut: 'Put',
            buyOrSell: 'Sell',
            strikePrice: 490,
            premium: 11.80,
            numberOfContracts: 1,
            cashReserve: 49000,
            collateralAmount: 49000,
            breakEvenPrice: 478.20,
            fees: 0.66,
            status: 'Open',
            stockPriceCurrent: 535.80,
        },
    ] as OptionsTransaction[];
}

// ---------------------------------------------------------------------------
// Trade Chains
// ---------------------------------------------------------------------------
function makeChains(): TradeChain[] {
    return [
        {
            id: CHAIN_TSLA,
            userId: 'demo-user',
            portfolioId: PORTFOLIO_ID,
            symbol: 'TSLA',
            optionType: 'Call',
            originalStrikePrice: 280,
            originalOpenDate: d('2025-07-07'),
            chainStatus: 'Active',
            totalChainPnl: 2152.72,
            createdAt: d('2025-07-07'),
            updatedAt: d('2025-10-10'),
        },
        {
            id: CHAIN_AVGO,
            userId: 'demo-user',
            portfolioId: PORTFOLIO_ID,
            symbol: 'AVGO',
            optionType: 'Put',
            originalStrikePrice: 155,
            originalOpenDate: d('2025-08-04'),
            chainStatus: 'Active',
            totalChainPnl: 389.34,
            createdAt: d('2025-08-04'),
            updatedAt: d('2025-10-09'),
        },
        {
            id: CHAIN_AXON,
            userId: 'demo-user',
            portfolioId: PORTFOLIO_ID,
            symbol: 'AXON',
            optionType: 'Put',
            originalStrikePrice: 340,
            originalOpenDate: d('2025-05-05'),
            chainStatus: 'Closed',
            totalChainPnl: 1638.68,
            createdAt: d('2025-05-05'),
            updatedAt: d('2025-09-12'),
        },
    ] as TradeChain[];
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Returns a fresh deep copy of the seed state.
 * Called by DemoStore.getOrCreate() and DemoStore.reset().\
 */
export function buildSeedData(): DemoState {
    return {
        portfolios: [makePortfolio()],
        transactions: makeTransactions(),
        chains: makeChains(),
        lastAccessed: Date.now(),
        seedVersion: SEED_VERSION,
    };
}
