/**
 * demo-guards.ts
 *
 * Shared guard utilities for all /api/demo/* route handlers.
 *
 * Usage pattern:
 *
 *   export async function GET(request: NextRequest) {
 *       const guard = demoGuard(request);
 *       if (guard.error) return guard.error;
 *       const { sessionId, state } = guard;
 *       ...
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore, DemoState } from '@/lib/demo-store';

/** Returns true when demo mode is enabled via the ENABLE_DEMO_MODE=1 env var. */
export const isDemoEnabled = (): boolean => process.env.ENABLE_DEMO_MODE === '1';

/** Extracts the demo session ID from the x-demo-session-id request header. */
export const getSessionId = (request: NextRequest): string | null =>
    request.headers.get('x-demo-session-id');

/** Standard 404 response returned when demo mode is disabled. */
export const demDisabledResponse = () =>
    NextResponse.json({ error: 'Demo mode is disabled' }, { status: 404 });

/** Standard 400 response returned when the session ID header is missing. */
export const missingSessionResponse = () =>
    NextResponse.json({ success: false, error: 'Missing x-demo-session-id header' }, { status: 400 });

// ---------------------------------------------------------------------------
// Main guard helper — call this at the top of every demo route handler.
// ---------------------------------------------------------------------------

type DemoGuardOk = { error: null; sessionId: string; state: DemoState };
type DemoGuardFail = { error: NextResponse; sessionId: null; state: null };

/**
 * Validates that:
 *   1. Demo mode is enabled (ENABLE_DEMO_MODE === '1')
 *   2. A valid x-demo-session-id header is present
 *
 * Returns either a ready-to-use `{ sessionId, state }` or an `{ error }` response
 * that should be returned immediately.
 *
 * @example
 *   const guard = demoGuard(request);
 *   if (guard.error) return guard.error;
 *   const { sessionId, state } = guard;
 */
export function demoGuard(request: NextRequest): DemoGuardOk | DemoGuardFail {
    if (!isDemoEnabled()) {
        return { error: demDisabledResponse(), sessionId: null, state: null };
    }

    const sessionId = getSessionId(request);
    if (!sessionId) {
        return { error: missingSessionResponse(), sessionId: null, state: null };
    }

    const state = demoStore.getOrCreate(sessionId);
    return { error: null, sessionId, state };
}
