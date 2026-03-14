/**
 * PUT    /api/demo/transactions/:id  — update a transaction in the session
 * DELETE /api/demo/transactions/:id  — delete a transaction from the session
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
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
    const idx = state.transactions.findIndex(t => t.id === id);

    if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    const updated = { ...state.transactions[idx], ...body, updatedAt: new Date() };
    state.transactions[idx] = updated;

    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const state = demoStore.getOrCreate(sessionId);
    const originalLength = state.transactions.length;
    state.transactions = state.transactions.filter(t => t.id !== id);

    if (state.transactions.length === originalLength) {
        return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
