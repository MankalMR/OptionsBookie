/**
 * POST /api/demo/reset
 * Discards the current in-memory demo state and re-seeds from defaults.
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';

export async function POST(request: NextRequest) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    demoStore.reset(sessionId);
    return NextResponse.json({ success: true });
}
