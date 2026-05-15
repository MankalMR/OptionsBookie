import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/demo-store';
import { demoGuard } from '@/lib/demo-guards';
import { isDemoRateLimited, getClientIp } from '@/lib/demo-rate-limiter';
import { OptionsTransaction } from '@/types/options';

export async function POST(request: NextRequest) {
    const guard = demoGuard(request);
    if (guard.error) return guard.error;
    const { sessionId } = guard;

    const ip = getClientIp(request);
    if (isDemoRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body)) {
        return NextResponse.json({ success: false, error: 'Invalid request body, expected array' }, { status: 400 });
    }

    const state = demoStore.getOrCreate(sessionId);
    const now = new Date();

    const newTransactions: OptionsTransaction[] = body.map((tx: Partial<OptionsTransaction>) => ({
        ...tx,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
    })) as OptionsTransaction[];

    state.transactions.unshift(...newTransactions);
    return NextResponse.json({ success: true, data: newTransactions });
}
