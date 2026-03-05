/**
 * demo-store.ts
 *
 * Server-side in-memory store for demo sessions.
 * Keyed by demoSessionId (a UUID stored in the client's localStorage).
 * Data is isolated per session and never touches the real Supabase DB.
 *
 * Lifetime: lives in the Node.js process; on Vercel cold-starts a fresh
 * session is silently re-created (accepted trade-off per design decision).
 *
 * Hot-reload strategy: only the sessions Map is pinned on globalThis, NOT
 * the DemoStore instance. This means the DemoStore class (and its imported
 * buildSeedData closure) is always fresh after a hot-reload, while user
 * session data survives each Next.js module re-evaluation.
 */

import { OptionsTransaction, Portfolio, TradeChain } from '@/types/options';
import { buildSeedData } from './demo-seed-data';

export interface DemoState {
    portfolios: Portfolio[];
    transactions: OptionsTransaction[];
    chains: TradeChain[];
    lastAccessed: number; // epoch ms — used for TTL eviction
    seedVersion: string;  // bumped when seed data changes; triggers auto-reseed
}

const DEFAULT_TTL_MS = parseInt(process.env.DEMO_SESSION_TTL_HOURS ?? '2', 10) * 60 * 60 * 1000;
const MAX_SESSIONS = parseInt(process.env.DEMO_MAX_SESSIONS ?? '100', 10);

// Pin only the sessions Map on globalThis so it survives hot-reloads in dev.
const globalForDemo = globalThis as unknown as { __demoSessions?: Map<string, DemoState> };
if (!globalForDemo.__demoSessions) {
    globalForDemo.__demoSessions = new Map<string, DemoState>();
}

class DemoStore {
    // Delegate to the globalThis-pinned Map so data persists across hot-reloads.
    private get sessions(): Map<string, DemoState> {
        return globalForDemo.__demoSessions!;
    }

    /** Return existing session or create (or reseed) one. */
    getOrCreate(sessionId: string): DemoState {
        const currentSeed = buildSeedData();
        let state = this.sessions.get(sessionId);

        if (!state || state.seedVersion !== currentSeed.seedVersion) {
            // Session missing OR seed data was updated — create/reseed
            if (!state && this.sessions.size >= MAX_SESSIONS) {
                this.evictStale(0); // try evicting expired first
                if (this.sessions.size >= MAX_SESSIONS) {
                    // Still full — evict the oldest session
                    let oldestId: string | null = null;
                    let oldestTime = Infinity;
                    for (const [id, s] of this.sessions) {
                        if (s.lastAccessed < oldestTime) {
                            oldestTime = s.lastAccessed;
                            oldestId = id;
                        }
                    }
                    if (oldestId) this.sessions.delete(oldestId);
                }
            }
            state = currentSeed;
            this.sessions.set(sessionId, state);
        }

        state.lastAccessed = Date.now();
        return state;
    }

    /** Return existing session without creating. */
    get(sessionId: string): DemoState | undefined {
        const state = this.sessions.get(sessionId);
        if (state) state.lastAccessed = Date.now();
        return state;
    }

    /** Discard existing data and re-seed from defaults. */
    reset(sessionId: string): DemoState {
        const fresh = buildSeedData();
        this.sessions.set(sessionId, fresh);
        return fresh;
    }

    /** Remove sessions inactive longer than ttlMs. */
    evictStale(ttlMs: number = DEFAULT_TTL_MS): void {
        const cutoff = Date.now() - ttlMs;
        for (const [id, state] of this.sessions) {
            if (state.lastAccessed < cutoff) {
                this.sessions.delete(id);
            }
        }
    }

    /** Visible for tests */
    get size(): number {
        return this.sessions.size;
    }
}

export const demoStore = new DemoStore();

// --- Background TTL eviction (runs every 30 min) ---
// Only register in a non-test environment to avoid jest hangs
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        demoStore.evictStale();
    }, 30 * 60 * 1000).unref?.(); // .unref() keeps Node from blocking exit
}
