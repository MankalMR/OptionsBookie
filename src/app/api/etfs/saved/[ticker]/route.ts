import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { etfCacheService } from '@/lib/etf-cache';
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticker } = await params;
    await etfCacheService.unsaveEtf(session.user.email, ticker.toUpperCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error unsaving ETF:');
    return NextResponse.json(
      { error: 'Failed to unsave ETF' },
      { status: 500 }
    );
  }
}
