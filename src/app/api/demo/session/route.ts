/**
 * POST /api/demo/session
 * Creates (or re-uses) a demo session and returns the sessionId.
 * The client stores this in localStorage and sends it as
 * 'x-demo-session-id' header on subsequent requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { isDemoEnabled, demDisabledResponse } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';

export async function POST(request: NextRequest) {
    if (!isDemoEnabled()) return demDisabledResponse();

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if client wants to reuse an existing session
    const body = await request.json().catch(() => ({}));
    const existingId: string | undefined = body?.sessionId;

    let sessionId: string;
    if (existingId && demoStore.get(existingId)) {
        // Reuse existing session (e.g. page reload)
        sessionId = existingId;
    } else {
        // Generate a fresh sessionId
        sessionId = crypto.randomUUID();
    }

    // Seed the store (no-op if already seeded)
    demoStore.getOrCreate(sessionId);

    return NextResponse.json({ sessionId });
}
