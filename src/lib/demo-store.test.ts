/**
 * demo-store.test.ts
 *
 * Unit tests for the in-memory demo session store.
 */

import { demoStore } from './demo-store';
import { buildSeedData } from './demo-seed-data';

describe('DemoStore', () => {
    const SESSION_A = 'test-session-a';
    const SESSION_B = 'test-session-b';

    afterEach(() => {
        // Clean up between tests by resetting known sessions
        // (The store is a singleton so we need to be careful)
        demoStore.reset(SESSION_A);
        demoStore.reset(SESSION_B);
    });

    describe('getOrCreate', () => {
        it('should seed fresh data on first call for a session', () => {
            const state = demoStore.getOrCreate(SESSION_A);

            expect(state).toBeDefined();
            expect(state.portfolios.length).toBeGreaterThan(0);
            expect(state.transactions.length).toBeGreaterThan(0);
            expect(state.chains.length).toBeGreaterThan(0);
            expect(state.lastAccessed).toBeGreaterThan(0);
        });

        it('should return the same state object on subsequent calls', () => {
            const first = demoStore.getOrCreate(SESSION_A);
            const second = demoStore.getOrCreate(SESSION_A);

            expect(first).toBe(second);
        });

        it('should return different state objects for different sessions', () => {
            const a = demoStore.getOrCreate(SESSION_A);
            const b = demoStore.getOrCreate(SESSION_B);

            expect(a).not.toBe(b);
        });

        it('should update lastAccessed on each call', () => {
            const state = demoStore.getOrCreate(SESSION_A);
            const firstAccess = state.lastAccessed;

            // Small delay to get a different timestamp
            state.lastAccessed = firstAccess - 1000;

            demoStore.getOrCreate(SESSION_A);
            expect(state.lastAccessed).toBeGreaterThanOrEqual(firstAccess);
        });
    });

    describe('get', () => {
        it('should return undefined for unknown session', () => {
            const state = demoStore.get('nonexistent-session-id');
            expect(state).toBeUndefined();
        });

        it('should return existing session data', () => {
            demoStore.getOrCreate(SESSION_A);
            const state = demoStore.get(SESSION_A);

            expect(state).toBeDefined();
            expect(state!.portfolios.length).toBeGreaterThan(0);
        });
    });

    describe('reset', () => {
        it('should restore seed data after mutations', () => {
            const state = demoStore.getOrCreate(SESSION_A);
            const originalCount = state.transactions.length;

            // Mutate the state
            state.transactions.push({
                ...state.transactions[0],
                id: 'user-added-tx',
                stockSymbol: 'ZZZZ',
            });

            expect(state.transactions.length).toBe(originalCount + 1);

            // Reset
            const freshState = demoStore.reset(SESSION_A);

            expect(freshState.transactions.length).toBe(originalCount);
            expect(freshState.transactions.find(t => t.id === 'user-added-tx')).toBeUndefined();
        });

        it('should return a new state object after reset', () => {
            const original = demoStore.getOrCreate(SESSION_A);
            const reset = demoStore.reset(SESSION_A);

            expect(reset).not.toBe(original);
        });
    });

    describe('evictStale', () => {
        it('should remove sessions older than the TTL', () => {
            const state = demoStore.getOrCreate(SESSION_A);

            // Artificially age the session
            state.lastAccessed = Date.now() - 999_999_999;

            demoStore.evictStale(1000); // 1 second TTL

            expect(demoStore.get(SESSION_A)).toBeUndefined();
        });

        it('should keep sessions within the TTL', () => {
            demoStore.getOrCreate(SESSION_A);

            demoStore.evictStale(999_999_999); // Very long TTL

            expect(demoStore.get(SESSION_A)).toBeDefined();
        });
    });
});

describe('buildSeedData', () => {
    it('should return fresh deep copies each time', () => {
        const a = buildSeedData();
        const b = buildSeedData();

        expect(a).not.toBe(b);
        expect(a.transactions).not.toBe(b.transactions);
        expect(a.chains).not.toBe(b.chains);
    });

    it('should contain a default portfolio', () => {
        const seed = buildSeedData();
        expect(seed.portfolios.length).toBe(1);
        expect(seed.portfolios[0].isDefault).toBe(true);
        expect(seed.portfolios[0].name).toContain('Demo');
    });

    it('should contain transactions with various statuses', () => {
        const seed = buildSeedData();
        const statuses = new Set(seed.transactions.map(t => t.status));

        expect(statuses.has('Open')).toBe(true);
        expect(statuses.has('Closed')).toBe(true);
        expect(statuses.has('Rolled')).toBe(true);
    });

    it('should contain both winning and losing trades', () => {
        const seed = buildSeedData();
        const closedTrades = seed.transactions.filter(
            t => t.status === 'Closed' && t.profitLoss !== undefined
        );

        const hasWin = closedTrades.some(t => (t.profitLoss ?? 0) > 0);
        const hasLoss = closedTrades.some(t => (t.profitLoss ?? 0) < 0);

        expect(hasWin).toBe(true);
        expect(hasLoss).toBe(true);
    });

    it('should have chains with matching transactions', () => {
        const seed = buildSeedData();

        for (const chain of seed.chains) {
            const chainTxns = seed.transactions.filter(t => t.chainId === chain.id);
            expect(chainTxns.length).toBeGreaterThanOrEqual(2); // At least 2 legs per chain
        }
    });
});
