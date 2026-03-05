/**
 * GET  /api/demo/transactions   — list all transactions for the session
 * POST /api/demo/transactions   — add a new transaction to the session
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';
import { OptionsTransaction } from '@/types/options';

export async function GET(request: NextRequest) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const state = demoStore.getOrCreate(sessionId);
    // Return in the same shape as /api/transactions for frontend compatibility
    return NextResponse.json({ success: true, data: state.transactions });
}

export async function POST(request: NextRequest) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const state = demoStore.getOrCreate(sessionId);
    const now = new Date();

    const newTransaction: OptionsTransaction = {
        ...body,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
    };

    state.transactions.unshift(newTransaction); // prepend (matches DB sort order)
    return NextResponse.json({ success: true, data: newTransaction });
}
