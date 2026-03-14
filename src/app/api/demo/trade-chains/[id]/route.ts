/**
 * PUT    /api/demo/trade-chains/:id  — update a chain (e.g. chainStatus)
 * DELETE /api/demo/trade-chains/:id  — delete chain + all its legs
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const state = demoStore.getOrCreate(sessionId);
    const idx = state.chains.findIndex(c => c.id === params.id);

    if (idx === -1) {
        return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }

    const updated = { ...state.chains[idx], ...body, updatedAt: new Date() };
    state.chains[idx] = updated;

    return NextResponse.json(updated);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const state = demoStore.getOrCreate(sessionId);

    // Delete the chain
    const originalChains = state.chains.length;
    state.chains = state.chains.filter(c => c.id !== params.id);

    if (state.chains.length === originalChains) {
        return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }

    // Delete all transactions belonging to this chain
    state.transactions = state.transactions.filter(t => t.chainId !== params.id);

    return NextResponse.json({ success: true });
}
