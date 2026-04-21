import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { etfCacheService } from '@/lib/etf-cache';
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticker } = body;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    await etfCacheService.unsaveEtf(session.user.email, ticker);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error unsaving ETF:');
    return NextResponse.json(
      { error: 'Failed to unsave ETF' },
      { status: 500 }
    );
  }
}
