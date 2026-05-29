import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { etfCacheService } from '@/lib/etf-cache';
import { logger } from "@/lib/logger";
import { calculateTopTenConcentration } from '@/lib/etf-utils';
import type { SavedEtf } from '@/types/etf';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const savedRows = await etfCacheService.getSavedEtfs(userEmail);

    const savedEtfs: SavedEtf[] = savedRows.map(row => {
      const topHoldings = row.top_holdings || [];
      const topTenWeight = calculateTopTenConcentration(topHoldings);

      return {
        ticker: row.ticker,
        fundName: row.fund_name ?? null,
        netExpenseRatio: row.net_expense_ratio ?? null,
        dividendYield: row.dividend_yield ?? null,
        netAssets: row.net_assets ?? null,
        portfolioTurnover: row.portfolio_turnover ?? null,
        leveraged: row.leveraged ?? null,
        topTenConcentration: (topTenWeight !== null && topTenWeight > 0) ? topTenWeight : null,
        topHoldings,
        sectorAllocation: row.sector_allocation || [],
        assetCategory: row.asset_category ?? null,
        cachedAt: row.cached_at ? new Date(row.cached_at).toISOString() : new Date().toISOString(),
        savedAt: row.saved_at ? new Date(row.saved_at).toISOString() : new Date().toISOString(),
        lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at).toISOString() : (row.saved_at ? new Date(row.saved_at).toISOString() : new Date().toISOString()),
        isSaved: row.is_saved !== false, // Default to true if null or true (for legacy data)
        notes: row.notes,
        isStale: row.cached_at && row.expires_at ? new Date(row.expires_at) < new Date() : false,
        isAiGenerated: row.provider === 'gemini',
      };
    });

    return NextResponse.json(savedEtfs);
  } catch (error) {
    logger.error({ error }, 'Error fetching saved ETFs:');
    return NextResponse.json(
      { error: 'Failed to fetch saved ETFs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticker, notes } = body;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    await etfCacheService.saveEtf(session.user.email, ticker, notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error saving ETF:');
    return NextResponse.json(
      { error: 'Failed to save ETF' },
      { status: 500 }
    );
  }
}
