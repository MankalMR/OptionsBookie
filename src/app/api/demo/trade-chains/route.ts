/**
 * GET  /api/demo/trade-chains         — list all chains for the session
 * POST /api/demo/trade-chains         — create a new chain in the session
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';
import { TradeChain } from '@/types/options';

export async function GET(request: NextRequest) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    const state = demoStore.getOrCreate(sessionId);
    let chains = state.chains;

    if (portfolioId && portfolioId !== 'all') {
        chains = chains.filter(c => c.portfolioId === portfolioId);
    }

    // Attach related transactions (same shape as real /api/trade-chains)
    const result = chains.map(chain => ({
        ...chain,
        transactions: state.transactions.filter(t => t.chainId === chain.id),
    }));

    return NextResponse.json(result);
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
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const state = demoStore.getOrCreate(sessionId);
    const now = new Date();

    const newChain: TradeChain = {
        id: crypto.randomUUID(),
        userId: 'demo-user',
        portfolioId: body.portfolioId,
        symbol: (body.symbol as string).toUpperCase(),
        optionType: body.optionType,
        originalStrikePrice: body.originalStrikePrice,
        originalOpenDate: new Date(body.originalOpenDate),
        chainStatus: body.chainStatus ?? 'Active',
        totalChainPnl: body.totalChainPnl ?? 0,
        createdAt: now,
        updatedAt: now,
    };

    state.chains.unshift(newChain);
    return NextResponse.json(newChain);
}
