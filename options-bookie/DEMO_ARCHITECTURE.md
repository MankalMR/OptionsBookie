# Demo Mode Architecture

> [!NOTE]
> This document covers the Demo Mode subsystem only. For the overall system architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Overview

Demo Mode provides a **public, no-authentication sandbox** at `/demo` where potential users can explore OptionsBookie with a realistic simulated portfolio — no Google sign-in required.

Key design goals:
- Reuse all existing React UI components (modals, charts, tables) without modification.
- Keep demo data **completely isolated** from the production Supabase database.
- Support full CRUD operations (add, edit, delete, roll trades) within each demo session.
- Provide a realistic starter portfolio that resets on demand.

---

## 2. Architecture Diagram

```mermaid
graph TD
    Visitor[Visitor (/demo)] -->|reads| LS[localStorage: demoSessionId]
    LS -->|POST /api/demo/session| SessionRoute[Session API]
    SessionRoute -->|getOrCreate| DemoStore[(DemoStore in-memory)]
    DemoStore -->|freshly seeded| SeedData[demo-seed-data.ts]

    Visitor -->|CRUD actions| DemoAPIRoutes["/api/demo/* routes"]
    DemoAPIRoutes -->|reads/writes| DemoStore

    DemoStore -.->|pinned on| GlobalThis[globalThis.__demoSessions Map]
    GlobalThis -.->|survives| HotReload[Next.js hot-reload]

    subgraph "Auth Guard"
        DemoAPIRoutes -->|checks| EnvFlag["ENABLE_DEMO_MODE === '1'"]
        DemoAPIRoutes -->|validates| SessionHeader["x-demo-session-id header"]
    end
```

---

## 3. Core Components

### 3.1 `src/lib/demo-store.ts` — In-Memory Session Store

The `DemoStore` class manages all demo sessions in a `Map<sessionId, DemoState>`.

| Method | Description |
|--------|-------------|
| `getOrCreate(sessionId)` | Returns existing session, or creates fresh one from seed data. If the session's `seedVersion` doesn't match the current seed, the session is **automatically reseeded** — ensuring cde-level seed updates propagate to existing users immediately. |
| `get(sessionId)` | Returns existing session without auto-creating. |
| `reset(sessionId)` | Discards all session data and reseeds from defaults. |
| `evictStale(ttlMs)` | Removes sessions inactive longer than `ttlMs`. Runs every 30 min in the background. |

**Hot-reload resilience:** Only the sessions `Map` is pinned on `globalThis.__demoSessions` — not the `DemoStore` instance itself. This means:
- Session **data** survives Next.js hot-reloads in dev (so users don't lose their work).
- `DemoStore` **methods** and the `buildSeedData` closure are always fresh after a hot-reload (so code changes take effect immediately).

### 3.2 `src/lib/demo-seed-data.ts` — Seed Portfolio

Provides `buildSeedData()` which returns a realistic starting portfolio of 12 transactions across 5 symbols:

| Symbol | Strategy | Status |
|--------|----------|--------|
| TSLA | Covered Call rolling chain | Open (2 rolled + 1 live) |
| AVGO | Cash-Secured Put chain + standalone CSP | Active |
| AXON | CSP rolling chain | Fully Closed (win) |
| ASML | LEAP Long Call | Open |
| ISRG | Closed CSP (win) + open CSP | Mixed |

**To update seed data:** Edit `makeTransactions()` and `makeChains()` in `demo-seed-data.ts`, then **bump the `SEED_VERSION` constant**. All existing sessions will be automatically reseeded on their next request.

```ts
// demo-seed-data.ts
export const SEED_VERSION = '2026-03-05-v2'; // ← bump this when you change seed data
```

### 3.3 API Routes — `src/app/api/demo/**`

All demo API routes share two guards at the top of every handler:

```ts
// Guard 1: Feature flag
if (process.env.ENABLE_DEMO_MODE !== '1') {
    return NextResponse.json({ error: 'Demo mode is not enabled' }, { status: 404 });
}
// Guard 2: Valid session
const sessionId = request.headers.get('x-demo-session-id') ?? '';
const session = demoStore.getOrCreate(sessionId);
```

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/demo/session` | POST | Creates or retrieves a demo session; returns `sessionId` |
| `/api/demo/portfolios` | GET | Returns the session's portfolio |
| `/api/demo/transactions` | GET, POST | Lists or creates transactions |
| `/api/demo/transactions/[id]` | PUT, DELETE | Updates or deletes a single transaction |
| `/api/demo/trade-chains` | GET, POST | Lists or creates trade chains |
| `/api/demo/trade-chains/[id]` | PUT, DELETE | Updates or deletes a single chain |
| `/api/demo/reset` | POST | Reseeds session to default state |

### 3.4 `src/components/DemoBanner.tsx` — Session Controls

A sticky amber banner shown at the top of every `/demo` page. Provides:
- A clear **"Demo Mode"** indicator so users know no real data is affected.
- A **"Reset Demo Data"** button that:
  1. Calls `POST /api/demo/reset` to reseed the server session.
  2. Clears `demoSessionId` from `localStorage`.
  3. Triggers the demo page to create a new session with fresh seed data.

### 3.5 `src/app/demo/page.tsx` — Demo Dashboard

A near-identical copy of the main `page.tsx` with these differences:
- **No `ProtectedRoute`** wrapper — publicly accessible.
- Fetches from `/api/demo/*` endpoints via `sessionId` in the `x-demo-session-id` header.
- Passes a demo-specific `onRollTrade` handler to `EditTransactionModal` to ensure roll operations use demo API endpoints instead of production ones.
- `sessionId` state is initialized from `localStorage` on mount; clearing it triggers full re-initialization.

---

## 4. Session Lifecycle

```
Visitor loads /demo
    └─> Read localStorage demoSessionId
         ├─> Exists? → POST /api/demo/session (sessionId returned, store reuses/reseeds it)
         └─> Missing? → POST /api/demo/session (new UUID created, store seeds fresh data)
                              └─> sessionId saved to localStorage

User works in demo (add/edit/delete/roll trades)
    └─> All CRUD via /api/demo/* with x-demo-session-id header

User clicks "Reset Demo Data"
    └─> POST /api/demo/reset (server reseeds)
    └─> localStorage.removeItem('demoSessionId')
    └─> page.tsx setSessionId(null) → re-initialization flow above
```

---

## 5. Configuration

Set these in your `.env.local` (local) or Vercel Project Settings (production):

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_DEMO_MODE` | `'1'` or `'0'` | — | **Required.** Set to `1` to activate all `/api/demo/*` routes. Omitting or setting to anything else returns 404 for all demo routes. |
| `DEMO_SESSION_TTL_HOURS` | number | `2` | Hours of inactivity before a session is evicted. |
| `DEMO_MAX_SESSIONS` | number | `100` | Maximum concurrent sessions before the oldest is evicted. |

---

## 6. Production Considerations

> [!WARNING]
> The demo store uses **in-memory state**. On Vercel's serverless platform, each function instance has its own memory. If Vercel routes requests for the same `sessionId` to different instances, the user may experience data loss mid-session.

**Why this is currently acceptable:**
- Demo sessions are intentionally ephemeral — the Reset button is always available.
- The seed version auto-reseed mechanism ensures users always get a usable portfolio.
- Traffic patterns for a demo page rarely require multi-instance coordination.

**If this becomes a problem**, the fix is to replace `DemoStore` with a shared Redis-backed store (e.g., Vercel KV / Upstash Redis) while keeping the same `DemoState` interface.

---

## 7. Security

- All demo API routes return **404** if `ENABLE_DEMO_MODE !== '1'`, making them completely invisible when the feature is off.
- Demo data is **write-isolated** from Supabase — no demo operation touches the production database.
- The `demoSessionId` in `localStorage` is an opaque UUID. There is no authentication or PII involved.
- Rate limiting is applied to all demo endpoints via `src/lib/demo-rate-limiter.ts`.
